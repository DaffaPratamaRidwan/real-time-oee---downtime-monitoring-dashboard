import { Hono } from 'hono'
import sql from '../db'

export const linesRouter = new Hono()

// GET /api/lines - List all production lines with live telemetry and today's metrics
linesRouter.get('/', async (c) => {
  try {
    const lines = await sql`
      SELECT 
        l.id,
        l.code,
        l.name,
        l.current_status,
        l.target_oee,
        l.ideal_units_per_hour,
        l.description,
        d.name as department_name,
        d.code as department_code,
        p.id as product_id,
        p.code as product_code,
        p.name as product_name,
        p.standard_cycle_time_sec,
        o.id as operator_id,
        o.name as operator_name,
        o.role as operator_role,
        t.speed_units_per_hour,
        t.temperature_c,
        t.vibration_rms,
        t.power_kw,
        t.vacuum_pressure_kpa,
        t.alert_level,
        t.error_code,
        t.timestamp as telemetry_updated_at,
        -- Aggregate today's OEE for this line
        COALESCE(today_oee.avg_oee, l.target_oee) as today_oee,
        COALESCE(today_oee.avg_availability, 90.0) as today_availability,
        COALESCE(today_oee.avg_performance, 92.0) as today_performance,
        COALESCE(today_oee.avg_quality, 98.5) as today_quality,
        COALESCE(today_oee.total_produced, 0)::INT as today_produced,
        COALESCE(today_oee.total_scrap, 0)::INT as today_scrap,
        COALESCE(today_oee.total_downtime_mins, 0)::INT as today_downtime_mins,
        -- Active downtime if any
        ad.id as active_downtime_id,
        ad.reason_name as active_reason_name,
        ad.category_name as active_category_name,
        ad.category_color as active_category_color,
        ad.start_time as active_downtime_start,
        ad.status as active_downtime_status,
        ad.duration_seconds as active_downtime_duration_seconds
      FROM production_lines l
      JOIN departments d ON l.department_id = d.id
      LEFT JOIN products p ON l.current_product_id = p.id
      LEFT JOIN operators o ON l.current_operator_id = o.id
      LEFT JOIN LATERAL (
        SELECT * FROM machine_telemetry 
        WHERE line_id = l.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) t ON TRUE
      LEFT JOIN LATERAL (
        SELECT 
          ROUND(AVG(oee), 2) as avg_oee,
          ROUND(AVG(availability), 2) as avg_availability,
          ROUND(AVG(performance), 2) as avg_performance,
          ROUND(AVG(quality), 2) as avg_quality,
          SUM(actual_units) as total_produced,
          SUM(scrap_units) as total_scrap,
          SUM(downtime_mins) as total_downtime_mins
        FROM oee_hourly_records
        WHERE line_id = l.id AND record_timestamp >= CURRENT_DATE
      ) today_oee ON TRUE
      LEFT JOIN LATERAL (
        SELECT 
          e.id,
          r.name as reason_name,
          c.name as category_name,
          c.color as category_color,
          e.start_time,
          e.status,
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

    return c.json({
      success: true,
      lines: lines.map(line => ({
        ...line,
        target_oee: Number(line.target_oee),
        today_oee: Number(line.today_oee),
        today_availability: Number(line.today_availability),
        today_performance: Number(line.today_performance),
        today_quality: Number(line.today_quality),
        temperature_c: Number(line.temperature_c),
        vibration_rms: Number(line.vibration_rms),
        power_kw: Number(line.power_kw),
        vacuum_pressure_kpa: Number(line.vacuum_pressure_kpa),
        speed_units_per_hour: Number(line.speed_units_per_hour)
      }))
    })
  } catch (err: any) {
    console.error('Error fetching lines:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/lines/:id - Line details with timeline & recent events
linesRouter.get('/:id', async (c) => {
  const lineId = parseInt(c.req.param('id'))
  if (isNaN(lineId)) return c.json({ success: false, error: 'Invalid line ID' }, 400)

  try {
    const lineQuery = await sql`
      SELECT 
        l.*,
        d.name as department_name,
        p.name as product_name,
        p.code as product_code,
        p.standard_cycle_time_sec,
        o.name as operator_name
      FROM production_lines l
      JOIN departments d ON l.department_id = d.id
      LEFT JOIN products p ON l.current_product_id = p.id
      LEFT JOIN operators o ON l.current_operator_id = o.id
      WHERE l.id = ${lineId};
    `

    if (lineQuery.length === 0) {
      return c.json({ success: false, error: 'Line not found' }, 404)
    }

    // Today's hourly timeline
    const hourly = await sql`
      SELECT 
        record_timestamp,
        planned_time_mins,
        run_time_mins,
        downtime_mins,
        actual_units,
        target_units,
        good_units,
        scrap_units,
        availability,
        performance,
        quality,
        oee
      FROM oee_hourly_records
      WHERE line_id = ${lineId} AND record_timestamp >= CURRENT_DATE - INTERVAL '24 hours'
      ORDER BY record_timestamp ASC;
    `

    // Recent downtime incidents for this line
    const recentDowntimes = await sql`
      SELECT 
        e.*,
        r.name as reason_name,
        c.name as category_name,
        c.color as category_color,
        o.name as operator_name
      FROM downtime_events e
      LEFT JOIN downtime_reasons r ON e.reason_id = r.id
      LEFT JOIN downtime_categories c ON r.category_id = c.id
      LEFT JOIN operators o ON e.reported_by = o.id
      WHERE e.line_id = ${lineId}
      ORDER BY e.start_time DESC
      LIMIT 10;
    `

    // Recent telemetry
    const telemetry = await sql`
      SELECT *
      FROM machine_telemetry
      WHERE line_id = ${lineId}
      ORDER BY timestamp DESC
      LIMIT 20;
    `

    return c.json({
      success: true,
      line: lineQuery[0],
      hourly_records: hourly,
      recent_downtimes: recentDowntimes,
      telemetry_history: telemetry
    })
  } catch (err: any) {
    console.error('Error fetching line details:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/lines/:id/status - Update line status manually
linesRouter.post('/:id/status', async (c) => {
  const lineId = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { status } = body

  const validStatuses = ['RUNNING', 'IDLE', 'DOWNTIME', 'MAINTENANCE']
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400)
  }

  try {
    await sql`
      UPDATE production_lines
      SET current_status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${lineId};
    `

    // Update telemetry state to match
    const alertLevel = status === 'DOWNTIME' ? 'CRITICAL' : (status === 'IDLE' ? 'WARNING' : 'NORMAL')
    await sql`
      UPDATE machine_telemetry
      SET status = ${status}, alert_level = ${alertLevel}, timestamp = CURRENT_TIMESTAMP
      WHERE line_id = ${lineId};
    `

    return c.json({ success: true, message: `Line ${lineId} status updated to ${status}` })
  } catch (err: any) {
    console.error('Error updating line status:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})
