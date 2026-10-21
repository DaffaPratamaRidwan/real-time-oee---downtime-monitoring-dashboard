export interface ProductionLine {
  id: number
  code: string
  name: string
  current_status: 'RUNNING' | 'IDLE' | 'DOWNTIME' | 'MAINTENANCE'
  target_oee: number
  ideal_units_per_hour: number
  description: string
  department_name: string
  department_code: string
  product_id?: number
  product_code?: string
  product_name?: string
  standard_cycle_time_sec?: string
  operator_id?: number
  operator_name?: string
  operator_role?: string
  speed_units_per_hour: number
  temperature_c: number
  vibration_rms: number
  power_kw: number
  vacuum_pressure_kpa: number
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL'
  error_code?: string
  telemetry_updated_at?: string
  today_oee: number
  today_availability: number
  today_performance: number
  today_quality: number
  today_produced: number
  today_scrap: number
  today_downtime_mins: number
  active_downtime_id?: number
  active_reason_name?: string
  active_category_name?: string
  active_category_color?: string
  active_downtime_start?: string
  active_downtime_status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  active_downtime_duration_seconds?: number
}

export interface DashboardSummary {
  oee: number
  target_oee: number
  availability: number
  performance: number
  quality: number
  total_produced: number
  total_good: number
  total_scrap: number
  scrap_rate: number
  total_downtime_mins: number
  total_run_time_mins: number
  active_downtimes_count: number
  mttr_minutes: number
  mtbf_hours: number
  line_status: {
    RUNNING: number
    IDLE: number
    DOWNTIME: number
    MAINTENANCE: number
    TOTAL: number
  }
}

export interface ActiveDowntime {
  id: number
  line_id: number
  line_name: string
  line_code: string
  department_name?: string
  reason_name: string
  reason_code?: string
  category_name: string
  category_color: string
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  start_time: string
  duration_seconds: number
  operator_notes?: string
  reported_by_name?: string
}

export interface ParetoItem {
  reason_id: number
  reason_name: string
  reason_code: string
  category_name: string
  category_color: string
  is_planned: boolean
  occurrences: number
  total_seconds: number
  total_minutes: number
  percentage: number
  cumulative_percentage: number
}

export const useFactoryApi = () => {
  const config = useRuntimeConfig()
  const apiBase = (import.meta.server && config.apiBaseInternal)
    ? config.apiBaseInternal
    : (config.public.apiBase || 'http://localhost:3001')

  const fetchSummary = async () => {
    return await $fetch<{ success: boolean, summary: DashboardSummary, active_downtimes: ActiveDowntime[], shifts: any[] }>(`${apiBase}/api/dashboard/summary`)
  }

  const fetchLines = async () => {
    return await $fetch<{ success: boolean, lines: ProductionLine[] }>(`${apiBase}/api/lines`)
  }

  const fetchLineDetails = async (id: number) => {
    return await $fetch<any>(`${apiBase}/api/lines/${id}`)
  }

  const setLineStatus = async (lineId: number, status: string) => {
    return await $fetch<any>(`${apiBase}/api/lines/${lineId}/status`, {
      method: 'POST',
      body: { status }
    })
  }

  const fetchActiveDowntimes = async () => {
    return await $fetch<{ success: boolean, active_downtimes: ActiveDowntime[] }>(`${apiBase}/api/downtime/active`)
  }

  const fetchPareto = async (days = 7, lineId?: number) => {
    const query = new URLSearchParams()
    if (days) query.set('days', String(days))
    if (lineId) query.set('lineId', String(lineId))
    return await $fetch<{ success: boolean, timeframe_days: number, grand_total_minutes: number, pareto: ParetoItem[] }>(`${apiBase}/api/downtime/pareto?${query.toString()}`)
  }

  const fetchDowntimeReasons = async () => {
    return await $fetch<{ success: boolean, categories: any[], reasons: any[] }>(`${apiBase}/api/downtime/reasons`)
  }

  const fetchDowntimeHistory = async (params: { limit?: number, lineId?: number, status?: string, categoryId?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', String(params.limit))
    if (params.lineId) query.set('lineId', String(params.lineId))
    if (params.status) query.set('status', params.status)
    if (params.categoryId) query.set('categoryId', String(params.categoryId))
    return await $fetch<{ success: boolean, history: any[] }>(`${apiBase}/api/downtime/history?${query.toString()}`)
  }

  const logDowntime = async (data: { line_id: number, reason_id: number, operator_notes?: string, reported_by?: number }) => {
    return await $fetch<any>(`${apiBase}/api/downtime/log`, {
      method: 'POST',
      body: data
    })
  }

  const acknowledgeDowntime = async (id: number) => {
    return await $fetch<any>(`${apiBase}/api/downtime/${id}/acknowledge`, {
      method: 'POST'
    })
  }

  const resolveDowntime = async (id: number, resolution_notes?: string) => {
    return await $fetch<any>(`${apiBase}/api/downtime/${id}/resolve`, {
      method: 'POST',
      body: { resolution_notes }
    })
  }

  const fetchHourlyAnalytics = async (hours = 24, lineId?: number) => {
    const query = new URLSearchParams()
    if (hours) query.set('hours', String(hours))
    if (lineId) query.set('lineId', String(lineId))
    return await $fetch<{ success: boolean, hourly: any[] }>(`${apiBase}/api/analytics/hourly?${query.toString()}`)
  }

  const fetchDefectAnalytics = async (days = 7, lineId?: number) => {
    const query = new URLSearchParams()
    if (days) query.set('days', String(days))
    if (lineId) query.set('lineId', String(lineId))
    return await $fetch<{ success: boolean, grand_total_scrap: number, defects: any[] }>(`${apiBase}/api/analytics/defects?${query.toString()}`)
  }

  const fetchShiftAnalytics = async (days = 7) => {
    return await $fetch<{ success: boolean, shifts: any[] }>(`${apiBase}/api/analytics/shifts?days=${days}`)
  }

  const triggerSimulationTick = async () => {
    return await $fetch<any>(`${apiBase}/api/simulate/tick`, { method: 'POST' })
  }

  const triggerSimulationFault = async (lineCode = 'SMT-01') => {
    return await $fetch<any>(`${apiBase}/api/simulate/trigger-fault`, {
      method: 'POST',
      body: { line_code: lineCode }
    })
  }

  const resetAllSimulation = async () => {
    return await $fetch<any>(`${apiBase}/api/simulate/reset-all`, { method: 'POST' })
  }

  return {
    apiBase,
    fetchSummary,
    fetchLines,
    fetchLineDetails,
    setLineStatus,
    fetchActiveDowntimes,
    fetchPareto,
    fetchDowntimeReasons,
    fetchDowntimeHistory,
    logDowntime,
    acknowledgeDowntime,
    resolveDowntime,
    fetchHourlyAnalytics,
    fetchDefectAnalytics,
    fetchShiftAnalytics,
    triggerSimulationTick,
    triggerSimulationFault,
    resetAllSimulation
  }
}
