-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "stopCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "zone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "routeNumber" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "busType" TEXT NOT NULL DEFAULT 'Standard',
    "totalDistanceKm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentTravelTime" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "medianDurationSec" DOUBLE PRECISION NOT NULL,
    "p90DurationSec" DOUBLE PRECISION NOT NULL,
    "trafficDelaySec" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SegmentTravelTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentCrowdedness" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "occupancyRatio" DOUBLE PRECISION NOT NULL,
    "crowdingCategory" TEXT NOT NULL,
    "standingLikelihood" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SegmentCrowdedness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneySearchLog" (
    "id" TEXT NOT NULL,
    "originQuery" TEXT NOT NULL,
    "destinationQuery" TEXT NOT NULL,
    "optimizePreference" TEXT NOT NULL DEFAULT 'balanced',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneySearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePosition" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "routeId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "bearing" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStopSequence" INTEGER,
    "stopId" TEXT,

    CONSTRAINT "VehiclePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stop_stopCode_key" ON "Stop"("stopCode");
CREATE INDEX "Stop_lat_lon_idx" ON "Stop"("lat", "lon");
CREATE INDEX "Stop_name_idx" ON "Stop"("name");
CREATE UNIQUE INDEX "BusRoute_routeNumber_key" ON "BusRoute"("routeNumber");
CREATE INDEX "BusRoute_routeNumber_idx" ON "BusRoute"("routeNumber");
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");
CREATE INDEX "RouteStop_stopId_idx" ON "RouteStop"("stopId");
CREATE UNIQUE INDEX "RouteStop_routeId_stopSequence_key" ON "RouteStop"("routeId", "stopSequence");
CREATE INDEX "SegmentTravelTime_routeId_hourOfDay_dayOfWeek_idx" ON "SegmentTravelTime"("routeId", "hourOfDay", "dayOfWeek");
CREATE INDEX "SegmentTravelTime_fromStopId_toStopId_idx" ON "SegmentTravelTime"("fromStopId", "toStopId");
CREATE INDEX "SegmentCrowdedness_routeId_hourOfDay_dayOfWeek_idx" ON "SegmentCrowdedness"("routeId", "hourOfDay", "dayOfWeek");
CREATE INDEX "SegmentCrowdedness_fromStopId_toStopId_idx" ON "SegmentCrowdedness"("fromStopId", "toStopId");
CREATE INDEX "VehiclePosition_vehicleId_idx" ON "VehiclePosition"("vehicleId");
CREATE INDEX "VehiclePosition_routeId_idx" ON "VehiclePosition"("routeId");
CREATE INDEX "VehiclePosition_timestamp_idx" ON "VehiclePosition"("timestamp");
CREATE INDEX "VehiclePosition_lat_lon_idx" ON "VehiclePosition"("lat", "lon");

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SegmentTravelTime" ADD CONSTRAINT "SegmentTravelTime_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SegmentTravelTime" ADD CONSTRAINT "SegmentTravelTime_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SegmentTravelTime" ADD CONSTRAINT "SegmentTravelTime_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SegmentCrowdedness" ADD CONSTRAINT "SegmentCrowdedness_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
