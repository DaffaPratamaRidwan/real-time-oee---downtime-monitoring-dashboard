import { Hono } from 'hono'
import sql from '../db'

export const analyticsRouter = new Hono()

// GET /api/analytics/hourly - Hourly production, downtime & OEE breakdown
analyticsRouter.get('/hourly', async (c) => {
  try {
    const lineId = c.req.query('lineId')
    const hours = parseInt(c.req.query('hours') || '24')

    const rows = await sql`
      SELECT 
        TO_CHAR(record_timestamp, 'HH24:00') as hour_label,
        record_timestamp,
        ROUND(AVG(availability), 2) as availability,
        ROUND(AVG(performance), 2) as performance,
        ROUND(AVG(quality), 2) as quality,
        ROUND(AVG(oee), 2) as oee,
        SUM(actual_units)::INT as actual_units,
        SUM(target_units)::INT as target_units,
        SUM(good_units)::INT as good_units,
        SUM(scrap_units)::INT as scrap_units,
        SUM(downtime_mins)::INT as downtime_mins,
        SUM(run_time_mins)::INT as run_time_mins
      FROM oee_hourly_records
      WHERE record_timestamp >= CURRENT_TIMESTAMP - (${hours} || ' hours')::INTERVAL
        ${lineId ? sql`AND line_id = ${parseInt(lineId)}` : sql``}
      GROUP BY TO_CHAR(record_timestamp, 'HH24:00'), record_timestamp
      ORDER BY record_timestamp ASC;
    `

    return c.json({
      success: true,
      timeframe_hours: hours,
      hourly: rows.map(r => ({
        ...r,
        availability: Number(r.availability),
        performance: Number(r.performance),
        quality: Number(r.quality),
        oee: Number(r.oee)
      }))
    })
  } catch (err: any) {
    console.error('Error fetching hourly analytics:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/analytics/defects - Scrap & defect reasons breakdown
analyticsRouter.get('/defects', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7')
    const lineId = c.req.query('lineId')

    const rows = await sql`
      SELECT 
        COALESCE(scrap_reason, 'Unknown Defect') as scrap_reason,
        COUNT(*)::INT as occurrence_count,
        SUM(scrap_units)::INT as total_scrap_units
      FROM production_logs
      WHERE timestamp >= CURRENT_DATE - (${days} || ' days')::INTERVAL
        AND scrap_units > 0
        ${lineId ? sql`AND line_id = ${parseInt(lineId)}` : sql``}
      GROUP BY scrap_reason
      ORDER BY total_scrap_units DESC;
    `

    const grandTotalScrap = rows.reduce((acc, curr) => acc + curr.total_scrap_units, 0)

    const defects = rows.map(r => ({
      scrap_reason: r.scrap_reason,
      occurrence_count: r.occurrence_count,
      total_scrap_units: r.total_scrap_units,
      percentage: grandTotalScrap > 0 ? Number(((r.total_scrap_units / grandTotalScrap) * 100).toFixed(1)) : 0
    }))

    return c.json({
      success: true,
      timeframe_days: days,
      grand_total_scrap: grandTotalScrap,
      defects
    })
  } catch (err: any) {
    console.error('Error fetching defect analytics:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/analytics/shifts - Shift performance comparison
analyticsRouter.get('/shifts', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7')

    const shifts = await sql`
      SELECT 
        s.id,
        s.code,
        s.name,
        s.start_time,
        s.end_time,
        ROUND(AVG(o.availability), 2) as avg_availability,
        ROUND(AVG(o.performance), 2) as avg_performance,
        ROUND(AVG(o.quality), 2) as avg_quality,
        ROUND(AVG(o.oee), 2) as avg_oee,
        SUM(o.actual_units)::INT as total_produced,
        SUM(o.scrap_units)::INT as total_scrap,
        SUM(o.downtime_mins)::INT as total_downtime_mins
      FROM shifts s
      LEFT JOIN oee_hourly_records o ON s.id = o.shift_id 
        AND o.record_timestamp >= CURRENT_DATE - (${days} || ' days')::INTERVAL
      GROUP BY s.id, s.code, s.name, s.start_time, s.end_time
      ORDER BY s.id ASC;
    `

    return c.json({
      success: true,
      timeframe_days: days,
      shifts: shifts.map(s => ({
        ...s,
        avg_availability: Number(s.avg_availability) || 0,
        avg_performance: Number(s.avg_performance) || 0,
        avg_quality: Number(s.avg_quality) || 0,
        avg_oee: Number(s.avg_oee) || 0,
        total_produced: Number(s.total_produced) || 0,
        total_scrap: Number(s.total_scrap) || 0,
        total_downtime_mins: Number(s.total_downtime_mins) || 0
      }))
    })
  } catch (err: any) {
    console.error('Error fetching shift analytics:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})
