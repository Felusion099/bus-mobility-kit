import { readFileSync, createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import dotenv from 'dotenv';
import { prisma } from '../src/services/prisma.service';

dotenv.config({ path: join(process.cwd(), '..', '..', '.env') });

const GTFS_DIR = join(process.cwd(), 'gtfs_static');

async function loadStops(): Promise<Map<string, string>> {
  const stopIdMap = new Map<string, string>();
  const raw = readFileSync(join(GTFS_DIR, 'stops.txt'), 'utf-8');
  const lines = raw.trim().split('\n');
  const header = lines[0].split(',');
  const idx = (name: string) => header.indexOf(name);
  const stops: Array<{ stopCode: string; name: string; lat: number; lon: number; zone: string | null; internalStopId: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const internalId = cols[idx('stop_id')].trim();
    const stopCode = cols[idx('stop_code')].trim();
    const name = cols[idx('stop_name')].trim();
    const lat = parseFloat(cols[idx('stop_lat')]);
    const lon = parseFloat(cols[idx('stop_lon')]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    stops.push({ stopCode, name, lat, lon, zone: null, internalStopId: internalId });
  }
  await prisma.routeStop.deleteMany();
  await prisma.segmentTravelTime.deleteMany();
  await prisma.segmentCrowdedness.deleteMany();
  await prisma.busRoute.deleteMany();
  await prisma.stop.deleteMany();
  const BATCH = 500;
  for (let i = 0; i < stops.length; i += BATCH) {
    const batch = stops.slice(i, i + BATCH);
    await prisma.stop.createMany({ data: batch.map((s) => ({ stopCode: s.stopCode, name: s.name, lat: s.lat, lon: s.lon, zone: s.zone })) });
    const codes = batch.map((s) => s.stopCode);
    const fetched = await prisma.stop.findMany({ where: { stopCode: { in: codes } }, select: { id: true, stopCode: true } });
    for (const f of fetched) { const src = batch.find((s) => s.stopCode === f.stopCode); if (src) stopIdMap.set(src.internalStopId, f.id); }
  }
  console.log(`[gtfs] loaded ${stops.length} stops`);
  return stopIdMap;
}

async function loadRoutes(): Promise<Map<string, string>> {
  const routeIdMap = new Map<string, string>();
  const raw = readFileSync(join(GTFS_DIR, 'routes.txt'), 'utf-8');
  const lines = raw.trim().split('\n');
  const header = lines[0].split(',');
  const idx = (name: string) => header.indexOf(name);
  const routes: Array<{ routeNumber: string; longName: string; internalRouteId: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const internalId = cols[idx('route_id')].trim();
    const shortName = cols[idx('route_short_name')].trim();
    const longName = cols[idx('route_long_name')].trim();
    routes.push({ routeNumber: shortName, longName, internalRouteId: internalId });
  }
  const BATCH = 500;
  for (let i = 0; i < routes.length; i += BATCH) {
    const batch = routes.slice(i, i + BATCH);
    await prisma.busRoute.createMany({ data: batch.map((r) => ({ routeNumber: r.routeNumber, longName: r.longName, busType: 'Standard', totalDistanceKm: 0 })) });
    const numbers = batch.map((r) => r.routeNumber);
    const fetched = await prisma.busRoute.findMany({ where: { routeNumber: { in: numbers } }, select: { id: true, routeNumber: true } });
    for (const f of fetched) { const src = batch.find((r) => r.routeNumber === f.routeNumber); if (src) routeIdMap.set(src.internalRouteId, f.id); }
  }
  console.log(`[gtfs] loaded ${routes.length} routes`);
  return routeIdMap;
}

async function loadTripRouteMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const raw = readFileSync(join(GTFS_DIR, 'trips.txt'), 'utf-8');
  const lines = raw.trim().split('\n');
  const header = lines[0].split(',');
  const idx = (name: string) => header.indexOf(name);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const tripId = cols[idx('trip_id')].trim();
    const routeId = cols[idx('route_id')].trim();
    map.set(tripId, routeId);
  }
  console.log(`[gtfs] mapped ${map.size} trips to routes`);
  return map;
}

async function buildRouteStopSequences(tripRouteMap: Map<string, string>, stopIdMap: Map<string, string>, routeIdMap: Map<string, string>): Promise<Map<string, Array<{ stopId: string; stopSequence: number }>>> {
  const routeStopSeq = new Map<string, Map<string, number>>();
  const file = createReadStream(join(GTFS_DIR, 'stop_times.txt'));
  const rl = createInterface({ input: file, crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    count++;
    if (count === 1) continue;
    const cols = line.split(',');
    const tripId = cols[0].trim();
    const stopId = cols[3].trim();
    const stopSequence = parseInt(cols[4].trim(), 10);
    const internalRouteId = tripRouteMap.get(tripId);
    if (!internalRouteId) continue;
    const prismaStopId = stopIdMap.get(stopId);
    if (!prismaStopId) continue;
    const prismaRouteId = routeIdMap.get(internalRouteId);
    if (!prismaRouteId) continue;
    let stopMap = routeStopSeq.get(prismaRouteId);
    if (!stopMap) { stopMap = new Map(); routeStopSeq.set(prismaRouteId, stopMap); }
    const existing = stopMap.get(prismaStopId);
    if (existing === undefined || stopSequence < existing) { stopMap.set(prismaStopId, stopSequence); }
  }
  const result = new Map<string, Array<{ stopId: string; stopSequence: number }>>();
  for (const [routeId, stopMap] of routeStopSeq) {
    const entries = Array.from(stopMap.entries()).map(([stopId, seq]) => ({ stopId, stopSequence: seq })).sort((a, b) => a.stopSequence - b.stopSequence);
    result.set(routeId, entries);
  }
  console.log(`[gtfs] processed ${count} stop_times rows, built sequences for ${result.size} routes`);
  return result;
}

async function createRouteStops(routeStopSequences: Map<string, Array<{ stopId: string; stopSequence: number }>>): Promise<number> {
  let total = 0;
  const BATCH = 1000;
  for (const [routeId, stops] of routeStopSequences) {
    const numbered = stops.map((s, idx) => ({ routeId, stopId: s.stopId, stopSequence: idx + 1 }));
    for (let i = 0; i < numbered.length; i += BATCH) {
      const batch = numbered.slice(i, i + BATCH);
      await prisma.routeStop.createMany({ data: batch });
      total += batch.length;
    }
  }
  console.log(`[gtfs] created ${total} route-stop entries`);
  return total;
}

async function main() {
  console.log('[gtfs] Starting GTFS static data load...');
  const stopIdMap = await loadStops();
  const routeIdMap = await loadRoutes();
  const tripRouteMap = await loadTripRouteMap();
  const routeStopSequences = await buildRouteStopSequences(tripRouteMap, stopIdMap, routeIdMap);
  await createRouteStops(routeStopSequences);
  const stopCount = await prisma.stop.count();
  const routeCount = await prisma.busRoute.count();
  const routeStopCount = await prisma.routeStop.count();
  console.log(`\n[gtfs] Load complete:\n  Stops: ${stopCount}\n  Routes: ${routeCount}\n  Route-Stops: ${routeStopCount}`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error('[gtfs] Error:', err); process.exit(1); });
