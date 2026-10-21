import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import sql from '../db'

export const streamRouter = new Hono()

streamRouter.get('/', async (c) => {
  return streamSSE(c, async (stream) => {
    console.log('[SSE] Client connected to live factory stream')

    stream.onAbort(() => {
      console.log('[SSE] Client disconnected from live factory stream')
    })

    while (true) {
      try {
        // 1. Fetch live telemetry for all lines
        const lines = await sql`
          SELECT 
            l.id,
            l.code,
            l.name,
            l.current_status,
            l.target_oee,
            t.speed_units_per_hour,
            t.temperature_c,
            t.vibration_rms,
            t.power_kw,
            t.vacuum_pressure_kpa,
            t.alert_level,
            t.error_code,
            ad.id as active_downtime_id,
            ad.reason_name as active_reason_name,
            ad.category_color as active_category_color,
            ad.duration_seconds as active_downtime_duration
          FROM production_lines l
          LEFT JOIN LATERAL (
            SELECT * FROM machine_telemetry 
            WHERE line_id = l.id 
            ORDER BY timestamp DESC 
            LIMIT 1
          ) t ON TRUE
          LEFT JOIN LATERAL (
            SELECT 
              e.id,
              r.name as reason_name,
              c.color as category_color,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - e.start_time))::INT as duration_seconds
            FROM downtime_events e
            LEFT JOIN downtime_reasons r ON e.reason_id = r.id
            LEFT JOIN downtime_categories c ON r.category_id = c.id
            WHERE e.line_id = l.id AND e.status IN ('ACTIVE', 'ACKNOWLEDGED')
            ORDER BY e.start_time DESC
            LIMIT 1
          ) ad ON TRUE
          ORDER BY l.id ASC;
        `

        // 2. Fetch active downtime count
        const activeCount = await sql`
          SELECT COUNT(*)::INT as count FROM downtime_events WHERE status IN ('ACTIVE', 'ACKNOWLEDGED');
        `

        const payload = {
          timestamp: new Date().toISOString(),
          active_downtimes_count: activeCount[0]?.count || 0,
          lines: lines.map(l => ({
            id: l.id,
            code: l.code,
            name: l.name,
            current_status: l.current_status,
            speed: Number(l.speed_units_per_hour) || 0,
            temp: Number(l.temperature_c) || 0,
            vibration: Number(l.vibration_rms) || 0,
            power: Number(l.power_kw) || 0,
            vacuum: Number(l.vacuum_pressure_kpa) || 0,
            alert_level: l.alert_level || 'NORMAL',
            error_code: l.error_code,
            active_downtime_id: l.active_downtime_id,
            active_reason_name: l.active_reason_name,
            active_category_color: l.active_category_color,
            active_duration_seconds: l.active_downtime_duration || 0
          }))
        }

        await stream.writeSSE({
          data: JSON.stringify(payload),
          event: 'factory_telemetry',
          id: String(Date.now()),
        })

        await stream.sleep(2500)
      } catch (err) {
        console.error('[SSE] Error streaming telemetry:', err)
        break
      }
    }
  })
})
