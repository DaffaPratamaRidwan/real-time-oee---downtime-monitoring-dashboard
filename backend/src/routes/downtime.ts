import { Hono } from 'hono'
import sql from '../db'

export const downtimeRouter = new Hono()

// GET /api/downtime/active - Get all active/unresolved downtime events
downtimeRouter.get('/active', async (c) => {
  try {
    const active = await sql`
      SELECT 
        e.id,
        e.line_id,
        l.code as line_code,
        l.name as line_name,
        d.name as department_name,
        r.id as reason_id,
        r.name as reason_name,
        r.code as reason_code,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.is_planned,
        e.start_time,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - e.start_time))::INT as duration_seconds,
        e.status,
        e.operator_notes,
        o.name as reported_by_name,
        e.acknowledged_at
      FROM downtime_events e
      JOIN production_lines l ON e.line_id = l.id
      JOIN departments d ON l.department_id = d.id
      LEFT JOIN downtime_reasons r ON e.reason_id = r.id
      LEFT JOIN downtime_categories c ON r.category_id = c.id
      LEFT JOIN operators o ON e.reported_by = o.id
      WHERE e.status IN ('ACTIVE', 'ACKNOWLEDGED')
      ORDER BY e.start_time ASC;
    `

    return c.json({ success: true, active_downtimes: active })
  } catch (err: any) {
    console.error('Error fetching active downtimes:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/downtime/pareto - Pareto analysis of downtime reasons
downtimeRouter.get('/pareto', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7')
    const lineId = c.req.query('lineId')

    const rows = await sql`
      SELECT 
        r.id as reason_id,
        r.name as reason_name,
        r.code as reason_code,
        c.name as category_name,
        c.color as category_color,
        c.is_planned,
        COUNT(e.id)::INT as occurrences,
        COALESCE(SUM(COALESCE(e.duration_seconds, 0)), 0)::INT as total_seconds,
        ROUND((COALESCE(SUM(COALESCE(e.duration_seconds, 0)), 0)::NUMERIC / 60.0), 1) as total_minutes
      FROM downtime_events e
      JOIN downtime_reasons r ON e.reason_id = r.id
      JOIN downtime_categories c ON r.category_id = c.id
      WHERE e.start_time >= CURRENT_DATE - (${days} || ' days')::INTERVAL
        ${lineId ? sql`AND e.line_id = ${parseInt(lineId)}` : sql``}
      GROUP BY r.id, r.name, r.code, c.name, c.color, c.is_planned
      ORDER BY total_seconds DESC;
    `

    // Calculate total minutes and cumulative percentage for Pareto
    const grandTotalMinutes = rows.reduce((acc, curr) => acc + Number(curr.total_minutes), 0)
    let cumulative = 0

    const pareto = rows.map(r => {
      const minutes = Number(r.total_minutes)
      const percentage = grandTotalMinutes > 0 ? Number(((minutes / grandTotalMinutes) * 100).toFixed(1)) : 0
      cumulative += percentage
      return {
        ...r,
        occurrences: Number(r.occurrences),
        total_seconds: Number(r.total_seconds),
        total_minutes: minutes,
        percentage,
        cumulative_percentage: Math.min(100.0, Number(cumulative.toFixed(1)))
      }
    })

    return c.json({
      success: true,
      timeframe_days: days,
      grand_total_minutes: grandTotalMinutes,
      pareto
    })
  } catch (err: any) {
    console.error('Error fetching pareto data:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/downtime/reasons - Available categories & reasons for logging modal
downtimeRouter.get('/reasons', async (c) => {
  try {
    const categories = await sql`
      SELECT id, code, name, is_planned, color, description
      FROM downtime_categories
      ORDER BY is_planned ASC, name ASC;
    `

    const reasons = await sql`
      SELECT id, category_id, code, name, description
      FROM downtime_reasons
      ORDER BY category_id ASC, name ASC;
    `

    return c.json({
      success: true,
      categories,
      reasons
    })
  } catch (err: any) {
    console.error('Error fetching downtime reasons:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/downtime/history - Historical downtime events with filtering
downtimeRouter.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const lineId = c.req.query('lineId')
    const status = c.req.query('status')
    const categoryId = c.req.query('categoryId')

    const history = await sql`
      SELECT 
        e.id,
        e.line_id,
        l.code as line_code,
        l.name as line_name,
        r.id as reason_id,
        r.name as reason_name,
        r.code as reason_code,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.is_planned,
        e.start_time,
        e.end_time,
        e.duration_seconds,
        ROUND((e.duration_seconds / 60.0), 1) as duration_minutes,
        e.status,
        e.operator_notes,
        e.resolution_notes,
        o.name as reported_by_name,
        e.acknowledged_at,
        e.resolved_at
      FROM downtime_events e
      JOIN production_lines l ON e.line_id = l.id
      LEFT JOIN downtime_reasons r ON e.reason_id = r.id
      LEFT JOIN downtime_categories c ON r.category_id = c.id
      LEFT JOIN operators o ON e.reported_by = o.id
      WHERE 1=1
        ${lineId ? sql`AND e.line_id = ${parseInt(lineId)}` : sql``}
        ${status ? sql`AND e.status = ${status}` : sql``}
        ${categoryId ? sql`AND c.id = ${parseInt(categoryId)}` : sql``}
      ORDER BY e.start_time DESC
      LIMIT ${limit};
    `

    return c.json({ success: true, history })
  } catch (err: any) {
    console.error('Error fetching downtime history:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/downtime/log - Operator logs a new downtime event
downtimeRouter.post('/log', async (c) => {
  try {
    const body = await c.req.json()
    const { line_id, reason_id, operator_notes, reported_by } = body

    if (!line_id || !reason_id) {
      return c.json({ success: false, error: 'line_id and reason_id are required' }, 400)
    }

    const startTime = new Date()

    // 1. Insert downtime event
    const newEvent = await sql`
      INSERT INTO downtime_events (
        line_id, reason_id, start_time, status, operator_notes, reported_by
      ) VALUES (
        ${line_id}, ${reason_id}, ${startTime}, 'ACTIVE', ${operator_notes || 'Operator logged downtime'}, ${reported_by || null}
      )
      RETURNING *;
    `

    // 2. Automatically update production line status to DOWNTIME
    await sql`
      UPDATE production_lines
      SET current_status = 'DOWNTIME', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${line_id};
    `

    // 3. Update machine telemetry to CRITICAL
    await sql`
      UPDATE machine_telemetry
      SET 
        status = 'DOWNTIME',
        speed_units_per_hour = 0,
        alert_level = 'CRITICAL',
        error_code = 'ERR_OPERATOR_STOP',
        timestamp = CURRENT_TIMESTAMP
      WHERE line_id = ${line_id};
    `

    return c.json({
      success: true,
      message: 'Downtime event logged successfully',
      event: newEvent[0]
    })
  } catch (err: any) {
    console.error('Error logging downtime:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/downtime/:id/acknowledge - Supervisor/technician acknowledges alert
downtimeRouter.post('/:id/acknowledge', async (c) => {
  try {
    const eventId = parseInt(c.req.param('id'))
    const acknowledgedAt = new Date()

    const updated = await sql`
      UPDATE downtime_events
      SET status = 'ACKNOWLEDGED', acknowledged_at = ${acknowledgedAt}
      WHERE id = ${eventId} AND status = 'ACTIVE'
      RETURNING *;
    `

    if (updated.length === 0) {
      return c.json({ success: false, error: 'Event not found or already acknowledged' }, 404)
    }

    return c.json({
      success: true,
      message: 'Downtime event acknowledged',
      event: updated[0]
    })
  } catch (err: any) {
    console.error('Error acknowledging downtime:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/downtime/:id/resolve - Resolve downtime event & resume line
downtimeRouter.post('/:id/resolve', async (c) => {
  try {
    const eventId = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const { resolution_notes } = body

    const resolvedAt = new Date()

    // 1. Get event start_time and line_id
    const event = await sql`
      SELECT id, line_id, start_time FROM downtime_events WHERE id = ${eventId};
    `
    if (event.length === 0) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const durationSec = Math.round((resolvedAt.getTime() - new Date(event[0].start_time).getTime()) / 1000)

    // 2. Mark event as RESOLVED
    const updated = await sql`
      UPDATE downtime_events
      SET 
        status = 'RESOLVED',
        end_time = ${resolvedAt},
        duration_seconds = ${durationSec},
        resolution_notes = ${resolution_notes || 'Problem rectified, line verified operational'},
        resolved_at = ${resolvedAt}
      WHERE id = ${eventId}
      RETURNING *;
    `

    const lineId = event[0].line_id

    // 3. Set production line back to RUNNING
    await sql`
      UPDATE production_lines
      SET current_status = 'RUNNING', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${lineId};
    `

    // 4. Update machine telemetry to NORMAL
    await sql`
      UPDATE machine_telemetry
      SET 
        status = 'RUNNING',
        alert_level = 'NORMAL',
        error_code = NULL,
        timestamp = CURRENT_TIMESTAMP
      WHERE line_id = ${lineId};
    `

    return c.json({
      success: true,
      message: 'Downtime event resolved and line returned to RUNNING',
      event: updated[0]
    })
  } catch (err: any) {
    console.error('Error resolving downtime:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})
