import { PrismaClient } from '@prisma/client';
import {
  DELHI_STOPS,
  DELHI_ROUTES,
} from '../src/services/mock-transit-data';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] clearing existing data...');
  await prisma.routeStop.deleteMany();
  await prisma.segmentTravelTime.deleteMany();
  await prisma.segmentCrowdedness.deleteMany();
  await prisma.busRoute.deleteMany();
  await prisma.stop.deleteMany();

  console.log('[seed] creating stops...');
  const stopMap = new Map<string, string>(); // mock id -> prisma id
  for (const s of DELHI_STOPS) {
    const created = await prisma.stop.upsert({
      where: { stopCode: s.id },
      update: {
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        zone: s.zone,
      },
      create: {
        stopCode: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        zone: s.zone,
      },
    });
    stopMap.set(s.id, created.id);
  }
  console.log(`[seed] created ${stopMap.size} stops`);

  console.log('[seed] creating routes...');
  const routeMap = new Map<string, string>(); // mock id -> prisma id
  for (const r of DELHI_ROUTES) {
    const created = await prisma.busRoute.upsert({
      where: { routeNumber: r.routeNumber },
      update: {
        longName: r.longName,
        busType: r.busType,
        totalDistanceKm: 0,
      },
      create: {
        routeNumber: r.routeNumber,
        longName: r.longName,
        busType: r.busType,
        totalDistanceKm: 0,
      },
    });
    routeMap.set(r.id, created.id);
  }
  console.log(`[seed] created ${routeMap.size} routes`);

  console.log('[seed] creating route-stops...');
  let routeStopCount = 0;
  for (const r of DELHI_ROUTES) {
    const prismaRouteId = routeMap.get(r.id);
    if (!prismaRouteId) continue;
    for (let i = 0; i < r.stops.length; i++) {
      const prismaStopId = stopMap.get(r.stops[i]);
      if (!prismaStopId) continue;
      await prisma.routeStop.upsert({
        where: { routeId_stopSequence: { routeId: prismaRouteId, stopSequence: i } },
        update: { stopId: prismaStopId },
        create: { routeId: prismaRouteId, stopId: prismaStopId, stopSequence: i },
      });
      routeStopCount++;
    }
  }
  console.log(`[seed] created ${routeStopCount} route-stops`);

  console.log('[seed] done');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed] fatal:', err);
  process.exit(1);
});