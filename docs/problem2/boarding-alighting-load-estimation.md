# Boarding/Alighting Load Estimation Method

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner

## 1. Purpose

Convert boarding and alighting records from e-ticketing/ETM into on-vehicle load by segment and time band.

## 2. Input Data

Minimum fields per ticket: ticket_id, route_id, direction, bus_id, boarding_stop_id, boarding_stop_seq, boarding_time, alighting_stop_id (optional), passenger_weight.

## 3. Trip Reconstruction

Group tickets by bus_id, route, direction, service_date. Split into trips where boarding_time gap > max_gap_minutes (default 90).

## 4. Handling Missing Alighting Data

| Alighting Data | Method | Output Level |
|----------------|--------|--------------|
| Stop + time | Direct cumulative sum | measured_occupancy |
| Stop only | Cumulative sum with inferred alighting time | measured_occupancy |
| No alighting | Inference via alighting distribution | inferred_occupancy |
| No data at all | Boarding demand proxy | boarding_demand_proxy |

## 5. Segment Load Computation

Method A: Direct cumulative sum (+weight at boarding, -weight at alighting).
Method B: Infer alighting time from GTFS schedule + 10% buffer.
Method C: Probabilistic alighting matrix.
Method D: Boarding demand proxy.

## 7. Output Schema

route_id, direction, segment_id, from_stop_id, to_stop_id, time_band, day_type, estimation_level, p10_load, p50_load, p80_load, p90_load, p95_load, mean_load, std_load, capacity, load_factor_p50, load_factor_p80, load_factor_p95, crowdedness_level, crowdedness_label, sample_count, uncertainty_flag, last_updated
