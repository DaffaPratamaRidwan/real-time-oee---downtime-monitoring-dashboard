import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import sql from './db'
import { dashboardRouter } from './routes/dashboard'
import { linesRouter } from './routes/lines'
import { downtimeRouter } from './routes/downtime'
import { analyticsRouter } from './routes/analytics'
import { streamRouter } from './routes/stream'
import { simulateRouter } from './routes/simulate'

const app = new Hono()

// Global Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health Check
app.get('/health', async (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/health', async (c) => {
  try {
    const dbTest = await sql`SELECT 1 as connected;`
    return c.json({
      status: 'healthy',
      service: 'OEE & Downtime Monitoring Backend (Hono)',
      db_connected: dbTest[0]?.connected === 1,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return c.json({
      status: 'unhealthy',
      service: 'OEE & Downtime Monitoring Backend (Hono)',
      db_connected: false,
      error: err.message
    }, 500)
  }
})
// Health check publik untuk monitoring/Docker
app.get('/health', (c) => c.text('OK', 200));
app.get('/api/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }, 200));
// Mount API routes
app.route('/api/dashboard', dashboardRouter)
app.route('/api/lines', linesRouter)
app.route('/api/downtime', downtimeRouter)
app.route('/api/analytics', analyticsRouter)
app.route('/api/stream', streamRouter)
app.route('/api/simulate', simulateRouter)

// Root fallback
app.get('/', (c) => {
  return c.json({
    message: 'Electrical Factory OEE & Downtime Monitoring API',
    endpoints: {
      health: '/api/health',
      dashboard_summary: '/api/dashboard/summary',
      lines: '/api/lines',
      active_downtime: '/api/downtime/active',
      downtime_pareto: '/api/downtime/pareto',
      downtime_history: '/api/downtime/history',
      downtime_reasons: '/api/downtime/reasons',
      hourly_analytics: '/api/analytics/hourly',
      defects_analytics: '/api/analytics/defects',
      shifts_analytics: '/api/analytics/shifts',
      live_stream: '/api/stream',
      simulation_tick: 'POST /api/simulate/tick',
      simulation_trigger_fault: 'POST /api/simulate/trigger-fault',
      simulation_reset_all: 'POST /api/simulate/reset-all'
    }
  })
})

const port = Number(process.env.PORT) || 3001

console.log(`[Hono Backend] Server is starting on port ${port}...`)

export default {
  port,
  fetch: app.fetch
}
