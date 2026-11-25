# Route/Stop Topology Extraction Design

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Design only. Build the road/time graph from GPS + route + stop data.
**Status:** Proposed design

## 1. Overview

The journey planner needs a graph whose nodes are stops and road junctions and whose edges carry time-dependent travel costs.

## 2. Graph model

**Nodes:**
- `stop` nodes — each `stop_id` with lat/lon
- `junction` nodes — road intersections from the Delhi road network

**Edges (typed):**
| Edge type | From | To | Weight | Meaning |
|-----------|------|----|--------|---------|
| `road` | junction | junction | travel_time_s | Drive along a road segment |
| `route` | stop | stop | travel_time_s | Bus travels between consecutive stops |
| `walk` | stop | junction | walking_time_s | Passenger walks from stop to road network |
| `walk` | stop | stop | walking_time_s | Passenger walks between nearby stops |
| `transfer` | stop | stop | transfer_penalty_s | Alight/board penalty at a shared stop |

## 3. Extraction steps

### 3.1 Stop nodes
Use the `stops` table as the authoritative stop set.

### 3.2 Route stop order
Use `route_stops.sequence` where present.

### 3.3 Route (stop-to-stop) edges
Collect GPS-based travel times between consecutive stops on a route.

### 3.4 Road (junction-to-junction) edges
From the Delhi road reference network, each road segment becomes a `road` edge.

### 3.5 Walk edges
- Stop → nearest junction: straight-line walking distance / walking speed (4 kmh), capped (300 m).
- Stop → nearby stop (within ~400 m): walking edge for transfers.

## 4. Time-dependence

All `road` and `route` edge weights are functions of `(day_type, time_bucket)`.

## 5. Output

```
nodes: [{id, type, lat, lon}]
edges: [{id, type, from, to, weight_s, confidence, day_type, time_bucket}]
```

## 6. Assumptions & limitations

- Stop-to-stop GPS travel times require buses to actually be observed stopping at both ends.
- Derived stops from GPS clustering are approximations.
- Road network reference data is external to the GPS kit.
