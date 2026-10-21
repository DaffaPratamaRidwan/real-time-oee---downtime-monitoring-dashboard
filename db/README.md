# Electrical Factory Database & Seeding Module

Standalone PostgreSQL schema, database migration, realistic seeding, and IoT telemetry simulator for the **Real-Time OEE & Downtime Monitoring Dashboard**.

This module is completely separated from the Hono backend, allowing independent lifecycle management, schema versioning, test data generation, and container orchestration.

## Features

- **Schema Definition (`schema.sql`)**: 11 normalized tables covering production lines, operators, shifts, products, downtime categories/reasons, downtime events, production logs, hourly OEE aggregates, and machine telemetry sensors.
- **Realistic Seeding (`seed.ts`)**: 
  - 5 Electrical factory departments (SMT, Magnetics Winding, Wire Harness, Final Assembly, Quality Test).
  - 3 Shifts (Morning, Afternoon, Night) with standard break times.
  - 6 Production lines with electrical products (Industrial Inverters, Toroidal Transformers, EV Fast-Charger Harnesses, DIN Power Supplies, Smart Meters).
  - 16 Downtime failure codes for Pareto analysis.
  - 7 Days of hourly OEE records (1000+ entries) with genuine Availability × Performance × Quality calculations.
  - Active and acknowledged live downtime events.
  - Real-time IoT machine telemetry readings.
- **Live Simulator (`simulate.ts`)**: Independent simulator script that updates machine telemetry in real-time.

## Quick Start

### 1. Start PostgreSQL with Docker
```bash
bun run db:up
```

### 2. Run Migrations
```bash
bun run db:migrate
```

### 3. Run Database Seeding
```bash
bun run db:seed
```

### 4. Reset Database (Migrate + Seed in one command)
```bash
bun run db:reset
```

### 5. Run Live IoT Telemetry Simulator (Optional)
```bash
# Single tick
bun run db:simulate

# Continuous loop (every 5 seconds)
bun run db:simulate:watch
```
