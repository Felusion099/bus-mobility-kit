import { prisma } from './prisma.service';

interface VehiclePosition {
  id: string;
  vehicleId: string;
  tripId: string | null;
  routeId: string | null;
  lat: number;
  lon: number;
  speed: number | null; // meters/second
  timestamp: Date;
  currentStopSequence: number | null;
  stopId: string | null;
}

interface Stop {
  id: string;
  stopCode: string;
  name: string;
  lat: number;
  lon: number;
}

interface RouteStop {
  stopId: string;
  stopSequence: number;
  stop: Stop;
}

interface Route {
  id: string;
  routeNumber: string;
  routeStops: RouteStop[];
}

// Speed profile per hour of day (km/h), built from real GTFS-RT vehicle positions
interface HourlySpeedProfile {
  hour: number;
  avgSpeedKmh: number;
  sampleCount: number;
  confidence: number; // 0-1 based on sample count
}

// Segment travel time model: routeNumber -> hour -> dayOfWeek -> { medianSec, p90Sec, confidence }
interface SegmentTimeModel {
  routeNumber: string;
  fromStopId: string;
  toStopId: string;
  hourOfDay: number;
  dayOfWeek: number;
  medianDurationSec: number;
  p90DurationSec: number;
  sampleCount: number;
  confidenceScore: number;
}

const STOP_PROXIMITY_METERS = 120; // within 120m counts as "at" a stop
const MIN_SAMPLES_FOR_CONFIDENCE = 5;

/**
 * Haversine distance between two points in meters.
 */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest stop within proximity meters, or null.
 */
function nearestStopWithin(lat: number, lon: number, stops: Stop[]): Stop | null {
  let best: Stop | null = null;
  let bestDist = Infinity;
  for (const s of stops) {
    const d = haversineMeters(lat, lon, s.lat, s.lon);
    if (d < bestDist && d <= STOP_PROXIMITY_METERS) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

/**
 * Confidence score from sample count (logarithmic scale, caps at 1.0 around 50 samples).
 */
function confidenceFromSamples(n: number): number {
  if (n <= 0) return 0;
  return Math.min(1, Math.log10(n + 1) / Math.log10(MIN_SAMPLES_FOR_CONFIDENCE * 10));
}

export class AiTravelTimePredictor {
  private stops: Stop[] = [];
  private routes: Route[] = [];
  private hourlySpeed: HourlySpeedProfile[] = [];
  private segmentModel: Map<string, SegmentTimeModel> = new Map();
  private loaded = false;

  /**
   * Build or rebuild the prediction model from real GTFS-RT vehicle positions
   * and the static route/stop data already in the database.
   */
  async buildModel(): Promise<{
    stops: number;
    routes: number;
    positions: number;
    segments: number;
    hourlyProfiles: number;
  }> {
    if (this.loaded) return this.summary();

    // 1. Load stops
    const dbStops = await prisma.stop.findMany();
    this.stops = dbStops.map((s) => ({
      id: s.id,
      stopCode: s.stopCode,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
    }));

    // 2. Load routes with stop sequences
    const dbRoutes = await prisma.busRoute.findMany({
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { stopSequence: 'asc' },
        },
      },
    });
    this.routes = dbRoutes.map((r) => ({
      id: r.id,
      routeNumber: r.routeNumber,
      routeStops: r.routeStops.map((rs) => ({
        stopId: rs.stopId,
        stopSequence: rs.stopSequence,
        stop: {
          id: rs.stop.id,
          stopCode: rs.stop.stopCode,
          name: rs.stop.name,
          lat: rs.stop.lat,
          lon: rs.stop.lon,
        },
      })),
    }));

    // 3. Load vehicle positions with speed data
    const positions: VehiclePosition[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "vehicleId", "tripId", "routeId", "lat", "lon", "speed", "timestamp", "currentStopSequence", "stopId"
       FROM "VehiclePosition"
       WHERE "speed" IS NOT NULL AND "speed" > 0`
    );

    // 4. Build hourly speed profiles from real speed observations
    this.hourlySpeed = this.buildHourlySpeedProfiles(positions);

    // 5. Build segment travel time model
    this.segmentModel = this.buildSegmentModel(positions);

    this.loaded = true;
    return this.summary();
  }

  private buildHourlySpeedProfiles(positions: VehiclePosition[]): HourlySpeedProfile[] {
    const byHour: Map<number, number[]> = new Map();
    for (const p of positions) {
      if (p.speed === null) continue;
      const hour = p.timestamp.getUTCHours();
      const arr = byHour.get(hour) ?? [];
      arr.push(p.speed);
      byHour.set(hour, arr);
    }

    const profiles: HourlySpeedProfile[] = [];
    for (let h = 0; h < 24; h++) {
      const speeds = byHour.get(h) ?? [];
      if (speeds.length === 0) {
        profiles.push({ hour: h, avgSpeedKmh: 20, sampleCount: 0, confidence: 0 });
        continue;
      }
      const avgMps = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const avgKmh = avgMps * 3.6;
      profiles.push({
        hour: h,
        avgSpeedKmh: Math.round(avgKmh * 10) / 10,
        sampleCount: speeds.length,
        confidence: confidenceFromSamples(speeds.length),
      });
    }
    return profiles;
  }

  private buildSegmentModel(positions: VehiclePosition[]): Map<string, SegmentTimeModel> {
    // Snap each position to the nearest stop (within proximity).
    const snapped: Array<{
      vehicleId: string;
      tripId: string | null;
      timestamp: Date;
      stopId: string | null;
      lat: number;
      lon: number;
      speed: number | null;
    }> = [];

    for (const p of positions) {
      const stop = nearestStopWithin(p.lat, p.lon, this.stops);
      snapped.push({
        vehicleId: p.vehicleId,
        tripId: p.tripId,
        timestamp: p.timestamp,
        stopId: stop?.id ?? null,
        lat: p.lat,
        lon: p.lon,
        speed: p.speed,
      });
    }

    // Sort by vehicle + timestamp to trace each vehicle's path.
    snapped.sort((a, b) => {
      if (a.vehicleId !== b.vehicleId) return a.vehicleId.localeCompare(b.vehicleId);
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // For each consecutive pair of snapped stops for the same vehicle,
    // record a segment travel time observation.
    const segmentObs: Map<string, Array<{ durationSec: number; hour: number; dayOfWeek: number }>> =
      new Map();

    let i = 0;
    while (i < snapped.length - 1) {
      const cur = snapped[i];
      let j = i + 1;
      // Find next snapped position for the same vehicle that is at a different stop.
      while (j < snapped.length && snapped[j].vehicleId === cur.vehicleId) {
        const nxt = snapped[j];
        if (cur.stopId && nxt.stopId && cur.stopId !== nxt.stopId) {
          const durationSec =
            (nxt.timestamp.getTime() - cur.timestamp.getTime()) / 1000;
          if (durationSec > 0 && durationSec < 3600) {
            // Only record if this stop pair is a consecutive segment on some route.
            const key = `${cur.stopId}|${nxt.stopId}`;
            const obs = segmentObs.get(key) ?? [];
            obs.push({
              durationSec,
              hour: cur.timestamp.getUTCHours(),
              dayOfWeek: cur.timestamp.getUTCDay(),
            });
            segmentObs.set(key, obs);
          }
          break;
        }
        j++;
      }
      i++;
    }

    // Aggregate into the model map, keyed by route|fromStop|toStop|hour|dayOfWeek.
    const model = new Map<string, SegmentTimeModel>();
    for (const [stopPairKey, obsList] of segmentObs) {
      const [fromStopId, toStopId] = stopPairKey.split('|');
      // Find which routes contain this consecutive stop pair.
      const containingRoutes = this.routes.filter((r) => {
        const ids = r.routeStops.map((rs) => rs.stopId);
        for (let k = 0; k < ids.length - 1; k++) {
          if (ids[k] === fromStopId && ids[k + 1] === toStopId) return true;
        }
        return false;
      });

      if (containingRoutes.length === 0) continue;

      // Group observations by hour + dayOfWeek.
      const byHourDay: Map<string, number[]> = new Map();
      for (const o of obsList) {
        const hk = `${o.hour}|${o.dayOfWeek}`;
        const arr = byHourDay.get(hk) ?? [];
        arr.push(o.durationSec);
        byHourDay.set(hk, arr);
      }

      for (const [hk, durations] of byHourDay) {
        const [hourStr, dowStr] = hk.split('|');
        const hourOfDay = parseInt(hourStr, 10);
        const dayOfWeek = parseInt(dowStr, 10);

        const sorted = durations.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p90 = sorted[Math.ceil((sorted.length * 90) / 100) - 1] || sorted[sorted.length - 1];

        for (const route of containingRoutes) {
          const modelKey = `${route.routeNumber}|${fromStopId}|${toStopId}|${hourOfDay}|${dayOfWeek}`;
          model.set(modelKey, {
            routeNumber: route.routeNumber,
            fromStopId,
            toStopId,
            hourOfDay,
            dayOfWeek,
            medianDurationSec: Math.round(median),
            p90DurationSec: Math.round(p90),
            sampleCount: durations.length,
            confidenceScore: Math.round(confidenceFromSamples(durations.length) * 100) / 100,
          });
        }
      }
    }

    return model;
  }

  private summary() {
    return {
      stops: this.stops.length,
      routes: this.routes.length,
      positions: 0,
      segments: this.segmentModel.size,
      hourlyProfiles: this.hourlySpeed.length,
    };
  }

  /**
   * Get the average speed (km/h) for a given hour of day, with fallback.
   */
  getSpeedForHour(hour: number): { avgSpeedKmh: number; confidence: number } {
    const prof = this.hourlySpeed.find((p) => p.hour === hour);
    if (!prof) return { avgSpeedKmh: 20, confidence: 0 };
    return { avgSpeedKmh: prof.avgSpeedKmh, confidence: prof.confidence };
  }

  /**
   * Predict travel time (seconds) between two stops on a route at a given time.
   * Falls back to distance/speed estimate when no historical data exists.
   */
  predictSegmentTime(
    routeNumber: string,
    fromStopId: string,
    toStopId: string,
    at: Date
  ): {
    medianDurationSec: number;
    p90DurationSec: number;
    confidenceScore: number;
    source: 'historical' | 'estimated';
  } {
    const hourOfDay = at.getUTCHours();
    const dayOfWeek = at.getUTCDay();

    // Try exact match first.
    const exactKey = `${routeNumber}|${fromStopId}|${toStopId}|${hourOfDay}|${dayOfWeek}`;
    let model = this.segmentModel.get(exactKey);

    // Fallback: same hour, any day of week.
    if (!model) {
      for (const [key, m] of this.segmentModel) {
        if (
          key.startsWith(`${routeNumber}|${fromStopId}|${toStopId}|${hourOfDay}|`) &&
          m.confidenceScore > 0
        ) {
          model = m;
          break;
        }
      }
    }

    // Fallback: adjacent hour.
    if (!model) {
      const altHour = (hourOfDay + 23) % 24; // previous hour
      for (const [key, m] of this.segmentModel) {
        if (
          key.startsWith(`${routeNumber}|${fromStopId}|${toStopId}|${altHour}|`) &&
          m.confidenceScore > 0
        ) {
          model = m;
          break;
        }
      }
    }

    if (model) {
      return {
        medianDurationSec: model.medianDurationSec,
        p90DurationSec: model.p90DurationSec,
        confidenceScore: model.confidenceScore,
        source: 'historical',
      };
    }

    // Estimated fallback: distance / avg speed for the hour.
    const route = this.routes.find((r) => r.routeNumber === routeNumber);
    const fromStop = this.stops.find((s) => s.id === fromStopId);
    const toStop = this.stops.find((s) => s.id === toStopId);

    if (!route || !fromStop || !toStop) {
      return {
        medianDurationSec: 300,
        p90DurationSec: 450,
        confidenceScore: 0.1,
        source: 'estimated',
      };
    }

    const distanceM = haversineMeters(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon);
    const speed = this.getSpeedForHour(hourOfDay);
    const avgSpeedMps = (speed.avgSpeedKmh * 1000) / 3600;
    const estimatedSec =
      avgSpeedMps > 0 ? distanceM / avgSpeedMps : distanceM / (20 * 1000 / 3600);

    return {
      medianDurationSec: Math.round(estimatedSec),
      p90DurationSec: Math.round(estimatedSec * 1.35),
      confidenceScore: Math.round(speed.confidence * 0.5 * 100) / 100,
      source: 'estimated',
    };
  }

  /**
   * Predict total travel time (minutes) for a list of consecutive stops on a route.
   */
  predictRouteTime(
    routeNumber: string,
    stopIds: string[],
    at: Date
  ): {
    totalDurationMinutes: number;
    averageConfidence: number;
    segmentCount: number;
    source: 'historical' | 'estimated' | 'mixed';
  } {
    let totalSec = 0;
    let confSum = 0;
    let historicalSegments = 0;
    let estimatedSegments = 0;

    for (let k = 0; k < stopIds.length - 1; k++) {
      const pred = this.predictSegmentTime(routeNumber, stopIds[k], stopIds[k + 1], at);
      totalSec += pred.medianDurationSec;
      confSum += pred.confidenceScore;
      if (pred.source === 'historical') historicalSegments++;
      else estimatedSegments++;
    }

    const source: 'historical' | 'estimated' | 'mixed' =
      historicalSegments > 0 && estimatedSegments > 0
        ? 'mixed'
        : historicalSegments > 0
          ? 'historical'
          : 'estimated';

    return {
      totalDurationMinutes: Math.round((totalSec / 60) * 10) / 10,
      averageConfidence: Math.round((confSum / Math.max(stopIds.length - 1, 1)) * 100) / 100,
      segmentCount: stopIds.length - 1,
      source,
    };
  }
}

export const aiTravelTimePredictor = new AiTravelTimePredictor();
