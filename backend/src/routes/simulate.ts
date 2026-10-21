import { Hono } from 'hono'
import sql from '../db'

export const simulateRouter = new Hono()

// POST /api/simulate/tick - Run a simulated production cycle
simulateRouter.post('/tick', async (c) => {
  try {
    const lines = await sql`SELECT id, code, current_status, ideal_units_per_hour FROM production_lines;`

    for (const line of lines) {
      if (line.current_status === 'RUNNING') {
        const tempVariation = (Math.random() - 0.5) * 1.5
        const vibVariation = (Math.random() - 0.5) * 0.08
        const pwrVariation = (Math.random() - 0.5) * 0.5
        const speed = Math.max(10, Math.round(line.ideal_units_per_hour * (0.92 + (Math.random() - 0.5) * 0.1)))

        await sql`
          UPDATE machine_telemetry
          SET 
            speed_units_per_hour = ${speed},
            temperature_c = ROUND(CAST(temperature_c + ${tempVariation} AS numeric), 2),
            vibration_rms = ROUND(CAST(GREATEST(0.1, vibration_rms + ${vibVariation}) AS numeric), 2),
            power_kw = ROUND(CAST(GREATEST(1.0, power_kw + ${pwrVariation}) AS numeric), 2),
            vacuum_pressure_kpa = ROUND(CAST(-85.0 + (RANDOM() - 0.5) * 4 AS numeric), 2),
            timestamp = CURRENT_TIMESTAMP
          WHERE line_id = ${line.id};
        `
      } else if (line.current_status === 'DOWNTIME') {
        // Increment duration
        await sql`
          UPDATE downtime_events
          SET duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INT
          WHERE line_id = ${line.id} AND status IN ('ACTIVE', 'ACKNOWLEDGED');
        `
      }
    }

    return c.json({ success: true, message: 'Simulation tick applied' })
  } catch (err: any) {
    console.error('Error in simulation tick:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/simulate/trigger-fault - Inject a fault for real-time testing
simulateRouter.post('/trigger-fault', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const lineCode = body.line_code || 'SMT-01'

    const targetLine = await sql`SELECT id, code, name FROM production_lines WHERE code = ${lineCode};`
    if (targetLine.length === 0) return c.json({ success: false, error: 'Line not found' }, 404)

    const lineId = targetLine[0].id

    // Pick a random reason
    const reasons = await sql`SELECT id, name FROM downtime_reasons ORDER BY RANDOM() LIMIT 1;`
    const reasonId = reasons[0].id
    const reasonName = reasons[0].name

    // 1. Insert downtime event
    const newEvent = await sql`
      INSERT INTO downtime_events (
        line_id, reason_id, start_time, status, operator_notes
      ) VALUES (
        ${lineId}, ${reasonId}, CURRENT_TIMESTAMP, 'ACTIVE', ${'Simulated automated sensor trip: ' + reasonName}
      )
      RETURNING *;
    `

    // 2. Set line status to DOWNTIME
    await sql`
      UPDATE production_lines
      SET current_status = 'DOWNTIME', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${lineId};
    `

    // 3. Set telemetry to CRITICAL
    await sql`
      UPDATE machine_telemetry
      SET 
        status = 'DOWNTIME',
        speed_units_per_hour = 0,
        alert_level = 'CRITICAL',
        error_code = 'ERR_SIM_FAULT',
        vacuum_pressure_kpa = -20.0,
        timestamp = CURRENT_TIMESTAMP
      WHERE line_id = ${lineId};
    `

    return c.json({
      success: true,
      message: `Triggered simulated fault on ${targetLine[0].name}: ${reasonName}`,
      event: newEvent[0]
    })
  } catch (err: any) {
    console.error('Error triggering simulated fault:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/simulate/reset-all - Reset all lines to RUNNING
simulateRouter.post('/reset-all', async (c) => {
  try {
    // 1. Resolve all active downtimes
    await sql`
      UPDATE downtime_events
      SET 
        status = 'RESOLVED',
        end_time = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INT,
        resolution_notes = 'Simulated reset all cleared active downtime',
        resolved_at = CURRENT_TIMESTAMP
      WHERE status IN ('ACTIVE', 'ACKNOWLEDGED');
    `

    // 2. Set all lines to RUNNING
    await sql`
      UPDATE production_lines
      SET current_status = 'RUNNING', updated_at = CURRENT_TIMESTAMP;
    `

    // 3. Reset machine telemetry
    await sql`
      UPDATE machine_telemetry
      SET 
        status = 'RUNNING',
        alert_level = 'NORMAL',
        error_code = NULL,
        speed_units_per_hour = 220,
        vacuum_pressure_kpa = -86.0,
        timestamp = CURRENT_TIMESTAMP;
    `

    return c.json({ success: true, message: 'All lines reset to normal RUNNING state' })
  } catch (err: any) {
    console.error('Error resetting factory lines:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})
