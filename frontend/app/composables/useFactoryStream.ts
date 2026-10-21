import { ref, onMounted, onUnmounted } from 'vue'

export interface LiveLineTelemetry {
  id: number
  code: string
  name: string
  current_status: 'RUNNING' | 'IDLE' | 'DOWNTIME' | 'MAINTENANCE'
  speed: number
  temp: number
  vibration: number
  power: number
  vacuum: number
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL'
  error_code?: string
  active_downtime_id?: number
  active_reason_name?: string
  active_category_color?: string
  active_duration_seconds: number
}

export const useFactoryStream = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:3001'

  const isConnected = ref(false)
  const isEnabled = ref(true)
  const lastUpdated = ref<string>('')
  const liveLines = ref<LiveLineTelemetry[]>([])
  const activeCount = ref(0)
  const error = ref<string | null>(null)

  let eventSource: EventSource | null = null
  let reconnectTimeout: any = null

  const connect = () => {
    if (!process.client || !isEnabled.value) return
    if (eventSource) {
      eventSource.close()
    }

    try {
      const streamUrl = `${apiBase}/api/stream`
      eventSource = new EventSource(streamUrl)

      eventSource.onopen = () => {
        isConnected.value = true
        error.value = null
      }

      eventSource.addEventListener('factory_telemetry', (event) => {
        try {
          const payload = JSON.parse(event.data)
          lastUpdated.value = payload.timestamp
          liveLines.value = payload.lines || []
          activeCount.value = payload.active_downtimes_count || 0
          isConnected.value = true
        } catch (e: any) {
          console.error('[SSE] Failed to parse factory telemetry:', e)
        }
      })

      eventSource.onerror = () => {
        isConnected.value = false
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        // Auto-reconnect after 3 seconds if still enabled
        if (isEnabled.value) {
          clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(() => {
            connect()
          }, 3000)
        }
      }
    } catch (e: any) {
      error.value = e.message
      isConnected.value = false
    }
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    clearTimeout(reconnectTimeout)
    isConnected.value = false
  }

  const toggleStream = () => {
    isEnabled.value = !isEnabled.value
    if (isEnabled.value) {
      connect()
    } else {
      disconnect()
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    isEnabled,
    lastUpdated,
    liveLines,
    activeCount,
    error,
    connect,
    disconnect,
    toggleStream
  }
}
