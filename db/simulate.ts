import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/oee_factory_db'
const sql = postgres(databaseUrl, { max: 1 })

export async function simulateTick() {
  console.log(`[Simulator] Running simulation tick at ${new Date().toISOString()}...`)

  // 1. Fetch current lines
  const lines = await sql`
    SELECT id, code, name, current_status, ideal_units_per_hour
    FROM production_lines
  `

  for (const line of lines) {
    if (line.current_status === 'RUNNING') {
      // Small sensor fluctuations around normal
      const tempDelta = (Math.random() - 0.5) * 1.2
      const vibDelta = (Math.random() - 0.5) * 0.1
      const powerDelta = (Math.random() - 0.5) * 0.4
      const speed = Math.max(10, Math.round(line.ideal_units_per_hour * (0.94 + (Math.random() - 0.5) * 0.08)))

      await sql`
        UPDATE machine_telemetry
        SET 
          timestamp = CURRENT_TIMESTAMP,
          status = 'RUNNING',
          speed_units_per_hour = ${speed},
          temperature_c = ROUND(CAST(temperature_c + ${tempDelta} AS numeric), 2),
          vibration_rms = ROUND(CAST(GREATEST(0.2, vibration_rms + ${vibDelta}) AS numeric), 2),
          power_kw = ROUND(CAST(GREATEST(1.0, power_kw + ${powerDelta}) AS numeric), 2),
          vacuum_pressure_kpa = ROUND(CAST(-85.0 + (RANDOM() - 0.5) * 4 AS numeric), 2),
          alert_level = 'NORMAL',
          error_code = NULL
        WHERE line_id = ${line.id};
      `
    } else if (line.current_status === 'DOWNTIME') {
      // Down machine: speed 0, low power, vacuum lost or alert
      await sql`
        UPDATE machine_telemetry
        SET 
          timestamp = CURRENT_TIMESTAMP,
          status = 'DOWNTIME',
          speed_units_per_hour = 0,
          power_kw = 2.8,
          vacuum_pressure_kpa = -25.0,
          alert_level = 'CRITICAL'
        WHERE line_id = ${line.id};
      `
      // Update duration_seconds on active downtime event
      await sql`
        UPDATE downtime_events
        SET duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INT
        WHERE line_id = ${line.id} AND status IN ('ACTIVE', 'ACKNOWLEDGED');
      `
    } else if (line.current_status === 'IDLE') {
      // Idle machine
      await sql`
        UPDATE machine_telemetry
        SET 
          timestamp = CURRENT_TIMESTAMP,
          status = 'IDLE',
          speed_units_per_hour = 0,
          power_kw = 1.5,
          alert_level = 'WARNING'
        WHERE line_id = ${line.id};
      `
    }
  }

  console.log('[Simulator] Simulation tick complete.')
}

async function run() {
  const isWatch = process.argv.includes('--watch')
  
  if (isWatch) {
    console.log('[Simulator] Starting continuous factory simulation loop (every 5 seconds)... Press Ctrl+C to stop.')
    while (true) {
      await simulateTick()
      await new Promise(r => setTimeout(r, 5000))
    }
  } else {
    await simulateTick()
    await sql.end()
  }
}

if (import.meta.main) {
  run().catch(err => {
    console.error('[Simulator] Error:', err)
    process.exit(1)
  })
}
