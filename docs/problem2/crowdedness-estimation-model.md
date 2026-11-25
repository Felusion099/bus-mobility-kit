# Crowdedness Estimation Model

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner

## 1. Overview

Estimate segment-level crowding from boarding/alighting-derived load estimates.

## 2. Input

Segment loads from `boarding-alighting-load-estimation.md` (p50, p80, p95 loads per segment-timeband).

## 3. Crowdedness Classification

Based on p80 load factor (p80_load / capacity):

| Level | Label | Load Factor | Description |
|-------|-------|-------------|-------------|
| 1 | comfortable | < 0.30 | Plenty of space |
| 2 | moderate | 0.30–0.50 | Some standing |
| 3 | crowded | 0.50–0.70 | Noticeable crowding |
| 4 | very_crowded | 0.70–0.90 | Difficult to move |
| 5 | crush | >= 0.90 | Crush capacity |

## 4. Time-Series Aggregation

Aggregate segment loads into route-level time series for dashboard visualization.

## 5. Output

crowdedness_level (1–5), crowdedness_label, load_factor_p80, sample_count, uncertainty_flag, estimation_level
