# Electrical Factory OEE & Downtime Monitoring API (Hono)

High-performance REST API and real-time Server-Sent Events (SSE) stream built with [Hono](https://hono.dev/) on Bun, backed by PostgreSQL.

## Architecture

```
backend/
├── src/
│   ├── db.ts               # PostgreSQL connection pool (postgres.js)
│   ├── routes/
│   │   ├── dashboard.ts    # Plant summary, OEE, Availability, Performance, Quality, MTBF, MTTR
│   │   ├── lines.ts        # Production line status, telemetry & details
│   │   ├── downtime.ts     # Active downtime list, history, logging, acknowledgement & resolution
│   │   ├── analytics.ts    # Hourly OEE, scrap defect breakdown, shift comparison
│   │   ├── stream.ts       # Real-time Server-Sent Events (/api/stream)
│   │   └── simulate.ts     # Interactive simulation triggers (fault injection, reset)
│   └── index.ts            # Hono application entrypoint with CORS & logger
├── .env                    # PORT=3001, DATABASE_URL
└── package.json
```

## Running the Backend

```bash
cd backend
bun install
bun run dev # or bun run src/index.ts
```

## API Endpoints

- `GET /api/health`: Health status & PostgreSQL connection test
- `GET /api/dashboard/summary`: Overall plant OEE, active alerts, line status counts, MTTR/MTBF
- `GET /api/lines`: Real-time status, OEE, and IoT telemetry for all production lines
- `GET /api/lines/:id`: Line details, 24-hour timeline, recent incident history
- `POST /api/lines/:id/status`: Update line status (RUNNING, IDLE, DOWNTIME, MAINTENANCE)
- `GET /api/downtime/active`: List of ongoing active downtime incidents
- `GET /api/downtime/pareto`: Pareto analysis (reasons, duration, occurrences, cumulative %)
- `GET /api/downtime/history`: Paginated downtime incident history with filters
- `GET /api/downtime/reasons`: Available categories and reason codes for operators
- `POST /api/downtime/log`: Operator reports new downtime event
- `POST /api/downtime/:id/acknowledge`: Acknowledge active downtime
- `POST /api/downtime/:id/resolve`: Resolve downtime with resolution notes
- `GET /api/analytics/hourly`: 24-hour production and OEE trend
- `GET /api/analytics/defects`: Electrical scrap & defect breakdown
- `GET /api/analytics/shifts`: Shift 1 vs Shift 2 vs Shift 3 comparison
- `GET /api/stream`: Real-Time SSE feed emitting live machine telemetry every 2.5s
- `POST /api/simulate/tick`: Trigger an instant simulation cycle
- `POST /api/simulate/trigger-fault`: Inject an unexpected fault on a line
- `POST /api/simulate/reset-all`: Reset all lines to normal RUNNING state
