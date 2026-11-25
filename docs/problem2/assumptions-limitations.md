# Assumptions, Data Limitations & Uncertainty Documentation

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner

## 1. Core Assumptions

### 1.1 E-Ticketing Data Representativeness
- E-ticketing passengers have similar boarding/alighting patterns as cash passengers
- Ticket `passenger_weight` (1.0 adult, 0.5 child) approximates space occupancy
- `bus_id` in ETM data reliably identifies a physical vehicle
- October 2026 is representative of typical operations

### 1.2 Alighting Inference
- Historical alighting distribution applies to boarding-only tickets
- Travel time between stops follows GTFS schedule + 10% buffer

### 1.3 Vehicle Capacity
- Standard bus = 50, Articulated = 80, Mini = 30 (pax)

## 2. Data Limitations

### 2.1 Coverage Limitation — Critical
**E-ticketing captures only ~3–4% of total bus tickets.**
- Sample size: 2.56M tickets / month ≈ 85k/day
- Many route-timeband cells will have < 10 observed tickets
- Bias risk: E-ticket adoption higher on metro feeder routes, AC/premium routes

### 2.2 Alighting Data Gap
- Boarding stop recorded for ~100% of e-tickets
- Alighting stop recorded for only 10–20% of e-tickets
- >80% of e-tickets are boarding-only

## 3. Uncertainty Quantification

| Level | Method | Typical Uncertainty |
|-------|--------|---------------------|
| L1: Measured | Direct board+alight cumulative | 15–25% |
| L2: Inferred | Boarding + alighting prob matrix | 30–50% |
| L3: Boarding Proxy | Cumulative boardings only | 50–100%+ |
| L4: Volume Proxy | Aggregate ticket count | N/A |

## 6. Required Disclaimers

In every API response: "This is a demand/crowding proxy based on e-ticketing data covering ~3–4% of total tickets. Not measured segment occupancy."
