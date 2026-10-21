# VOLTIX — Real-Time OEE & Downtime Monitoring Dashboard

A Smart Manufacturing Web Application for an **Electrical Equipment Factory**, providing real-time Overall Equipment Effectiveness (OEE) tracking, IoT machine telemetry, and Pareto root-cause downtime analysis.

Built with a modular decoupled architecture:
- **Frontend**: [Nuxt 4](https://nuxt.com/) (Vue 3, Tailwind CSS, Lucide icons, SSE real-time client)
- **Backend**: [Hono](https://hono.dev/) on [Bun](https://bun.sh/) (REST API + Server-Sent Events `/api/stream`)
- **Database & Seeder**: [PostgreSQL](https://www.postgresql.org/) (Dockerized, independent migrations, realistic electrical factory seeder, and IoT telemetry simulator)

---

## Architecture Overview

The system strictly decouples the database, backend, and frontend into 3 isolated packages:

```
real-time-oee-downtime-monitoring-dashboard/
├── db/                   # Standalone Database & Seeding Module (Separated from backend)
│   ├── docker-compose.yml# Containerized PostgreSQL service (Port 5433)
│   ├── schema.sql        # 11 relational tables, constraints, and indexes
│   ├── migrate.ts        # Database schema runner
│   ├── seed.ts           # Realistic electrical factory seed generator
│   ├── simulate.ts       # Standalone IoT machine telemetry simulator
│   ├── package.json      # Dedicated npm/bun scripts
│   └── README.md
│
├── backend/              # Hono REST & SSE Real-Time API
│   ├── src/
│   │   ├── db.ts         # High-performance async connection pool
│   │   ├── routes/
│   │   │   ├── dashboard.ts  # Plant summary, OEE, MTTR, MTBF
│   │   │   ├── lines.ts      # Workstation status & telemetry
│   │   │   ├── downtime.ts   # Active downtime, Pareto analysis, incident logs
│   │   │   ├── analytics.ts  # Hourly production, scrap defect breakdown, shift comparison
│   │   │   ├── stream.ts     # Real-Time SSE feed (/api/stream)
│   │   │   └── simulate.ts   # Interactive demo controls (fault injection, reset)
│   │   └── index.ts      # Hono application entrypoint with CORS
│   └── package.json
│
└── frontend/             # Nuxt 4 Frontend Dashboard
    ├── app/
    │   ├── components/
    │   │   ├── HeaderBar.vue           # Factory title, shift pill, clock, live controls
    │   │   ├── KpiMetrics.vue          # OEE index, output, scrap %, active alert banner, MTTR/MTBF
    │   │   ├── LineCard.vue            # Workstation cards with live telemetry (temp, speed, vibration, power, vacuum)
    │   │   ├── ParetoChart.vue         # Interactive SVG Pareto chart with 80/20 threshold
    │   │   ├── HourlyTimelineChart.vue # 24h target vs actual units & OEE curve
    │   │   ├── DefectBreakdown.vue     # Electrical defect classification & scrap impact
    │   │   ├── ShiftComparison.vue     # Morning vs Afternoon vs Night shift performance
    │   │   ├── DowntimeTable.vue       # Active ticking stoppage list & historical logs
    │   │   ├── LogDowntimeModal.vue    # Operator stoppage logging modal
    │   │   ├── ResolveDowntimeModal.vue# Incident resolution & line resumption modal
    │   │   └── LineDetailModal.vue     # In-depth workstation telemetry modal
    │   ├── composables/
    │   │   ├── useFactoryApi.ts        # REST API client
    │   │   └── useFactoryStream.ts     # SSE connection manager
    │   └── app.vue                     # Main dashboard view
    └── nuxt.config.ts
```

---

## Electrical Factory Domain Model

### 1. Workstations / Production Lines
1. **SMT-01**: SMT High-Speed Chip Shooter Line (Dual-gantry pick & place, 10-zone nitrogen reflow oven)
2. **SMT-02**: SMT High-Density Line (Fine-pitch BGA/QFN placement, 3D SPI solder paste inspection)
3. **WND-01**: Auto Toroidal Transformer Winder (CNC 4-axis toroidal coiler with enamel stripping)
4. **HAR-01**: Automotive Wire Harness Line (Automated wire cut/strip/crimp with Crimp Force Monitoring)
5. **ASM-01**: DIN-Rail Power Supply Final Assembly (Pneumatic fastening, potting, and laser marking)
6. **TST-01**: High-Voltage Hi-Pot & Burn-In Test Station (Dielectric breakdown, insulation resistance, 45°C burn-in)

### 2. OEE Formula (Overall Equipment Effectiveness)
$$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
- **Availability (A)**: $\frac{\text{Operating Run Time}}{\text{Planned Production Time}}$ (Impacted by equipment breakdowns, feeder jams, and reel replenishment)
- **Performance (P)**: $\frac{\text{Total Units} \times \text{Ideal Cycle Time}}{\text{Operating Run Time}}$ (Impacted by micro-stops and reduced machine speed)
- **Quality (Q)**: $\frac{\text{Good Units}}{\text{Total Units}}$ (Impacted by solder bridges, component tombstoning, and hi-pot flashover rejects)

### 3. Pareto 80/20 Downtime Analysis
Categorizes top downtime contributors to prioritize preventive maintenance:
- **Process Loss**: Feeder tape jams, SMT nozzle vacuum clogs, stencil aperture clogging.
- **Breakdown**: Reflow zone 4 temperature drift, wire stripper blade fractures.
- **Material Shortage**: Depleted SMD capacitor reels, copper wire spools.
- **Setup / Changeover**: Feeder trolley swaps, harness jig configurations.

---

## Quick Start Guide

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js v18+)
- [Docker](https://www.docker.com/) & Docker Compose

---

### Step 1: Database & Seeding (Standalone Module)

```bash
# 1. Start PostgreSQL container on port 5433
cd db
bun run db:up

# 2. Apply database migrations
bun run db:migrate

# 3. Seed realistic electrical factory data (lines, shifts, products, 7-day hourly logs, active incidents)
bun run db:seed

# Optional: Run migration + seed in one command
bun run db:reset
```

---

### Step 2: Start Hono Backend

```bash
cd backend
bun install
bun run dev
```
The backend starts at **`http://localhost:3001`**.
- Health check: `http://localhost:3001/api/health`
- Real-time SSE stream: `http://localhost:3001/api/stream`

---

### Step 3: Start Nuxt Frontend

```bash
cd frontend
bun install
bun run dev
```
The dashboard will be live at **`http://localhost:3000`**.

---

## Real-Time Interactive Features

1. **Live Server-Sent Events (SSE)**: Machine speeds, temperatures, vibration levels, power consumption, and active downtime durations automatically refresh every 2.5 seconds without polling or page reloads.
2. **Critical Stoppage Alert Banner**: Automatically pulses with high-contrast red warning when any workstation goes down, showing live elapsed stoppage time.
3. **Log Downtime Modal**: Operators can report machine stoppages, assign standardized root cause reason codes, and enter observations.
4. **Resolve & Resume Modal**: Supervisors enter corrective action taken (e.g. nozzle ultrasonic cleaning, feeder realignment) to automatically calculate final downtime duration and restore the workstation to `RUNNING`.
5. **Interactive Pareto Chart**: Visual dual-axis chart with an 80% cutoff line illustrating the vital few failure modes responsible for the majority of stoppage time.
6. **Simulation Controls**:
   - **Sim Tick**: Triggers instant sensor fluctuation cycle.
   - **Inject Fault**: Simulates an automated sensor trip / breakdown on an active line.
   - **Reset**: Instantly resolves all stoppages and returns all lines to nominal operation.
