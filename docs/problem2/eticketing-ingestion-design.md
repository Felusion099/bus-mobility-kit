# E-Ticketing Ingestion Design

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner

## 1. Overview

Ingest e-ticketing/ETM data into the Prisma/PostgreSQL schema for crowdedness estimation.

## 2. Source Data

ETM ticket records from Delhi Transport Stack API.

## 3. Pipeline

- Fetch tickets via API with pagination
- Validate required fields
- Enrich with GTFS stop sequences
- Upsert into Ticket table

## 4. Database Schema

Ticket model: ticket_id, route_id, direction, bus_id, boarding_stop_id, boarding_stop_seq, boarding_time, alighting_stop_id, alighting_stop_seq, alighting_time, passenger_weight, service_date, created_at
