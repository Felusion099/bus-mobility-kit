# Travel-Time Estimation Model Design

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Design only. Derive road-segment travel times from Delhi DTC bus GPS traces.
**Status:** Proposed design

## 1. Overview

Estimate the time a bus takes to traverse each road segment in Delhi as a function of time-of-day and day-of-week.

## 2. Core idea

Map-match each GPS fix to a road segment, compute per-segment travel time from consecutive fixes on the same segment, aggregate into time buckets and day types:

`segment_id x day_type x time_bucket -> {median_travel_time_s, p10, p90, observation_count, confidence}`

## 3. Pipeline

### 3.1 Map-matching
Snap each GPS fix to the nearest road segment centerline within 25 m.

### 3.2 Trajectory segmentation
Order fixes by `(vehicle_id, timestamp_utc)`. For consecutive fixes on same vehicle mapping to same segment, compute `travel_time = t2 - t1`.

### 3.3 Aggregation
Bucket by day_type (weekend/weekday/holiday) and 30-minute time bucket. Compute count, median, p10, p90, mean_speed, confidence.

### 3.4 Sparse observations
Temporal smoothing, spatial smoothing, historical pattern, default free-flow speed.

## 5. Output

| segment_id | day_type | time_bucket_start | median_travel_time_s | p10_s | p90_s | count | confidence |
