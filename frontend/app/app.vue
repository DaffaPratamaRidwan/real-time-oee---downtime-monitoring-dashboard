<template>
  <div class="min-h-screen bg-[#0a0c12] text-zinc-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-200">
    <!-- Clean, Serene Header -->
    <HeaderBar 
      :is-stream-connected="isConnected"
      :is-simulating="isSimulating"
      :active-shift-name="currentShiftName"
      @toggle-stream="toggleStream"
      @sim-tick="handleSimTick"
      @sim-fault="handleSimFault"
      @sim-reset="handleSimReset"
      @open-log-modal="isLogModalOpen = true"
    />

    <!-- Main Content -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <!-- Unified Calm KPI Metrics -->
      <KpiMetrics 
        :summary="summary"
        :active-downtimes="activeDowntimes"
        @view-active-downtimes="currentTab = 'downtime_pareto'"
      />

      <!-- Navigation & View Options -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
        <!-- Quiet Segmented Control -->
        <div class="flex items-center gap-1 bg-[#11141d]/80 p-1 rounded-xl border border-zinc-800/60 w-fit">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
              currentTab === tab.id
                ? 'bg-zinc-800/90 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            ]"
          >
            <span>{{ tab.label }}</span>
            <span 
              v-if="tab.id === 'plant_floor' && activeDowntimes.length > 0"
              class="w-1.5 h-1.5 rounded-full bg-rose-400"
            ></span>
            <span 
              v-if="tab.id === 'downtime_pareto' && activeDowntimes.length > 0"
              class="px-1.5 py-0.2 rounded-full bg-rose-500/80 text-white text-[10px] font-mono font-medium"
            >
              {{ activeDowntimes.length }}
            </span>
          </button>
        </div>

        <!-- Right Side: View Mode & Sync Status -->
        <div class="flex items-center gap-4 text-xs">
          <!-- View Toggle for Plant Floor (Cards vs Table) -->
          <div v-if="currentTab === 'plant_floor'" class="flex items-center gap-1 bg-[#11141d]/80 p-0.5 rounded-lg border border-zinc-800/60 text-zinc-400">
            <button 
              @click="viewMode = 'grid'" 
              :class="['px-2 py-1 rounded text-[11px] transition', viewMode === 'grid' ? 'bg-zinc-800 text-zinc-200 font-medium' : 'hover:text-zinc-200']"
              title="Tampilan Kartu"
            >
              Kartu
            </button>
            <button 
              @click="viewMode = 'table'" 
              :class="['px-2 py-1 rounded text-[11px] transition', viewMode === 'table' ? 'bg-zinc-800 text-zinc-200 font-medium' : 'hover:text-zinc-200']"
              title="Tampilan Tabel Ringkas"
            >
              Tabel
            </button>
          </div>

          <!-- Sync Timestamp -->
          <div class="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
            <span>Sinkron: {{ formattedLastUpdated }}</span>
            <button 
              @click="refreshData" 
              title="Muat ulang data"
              class="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"
            >
              <RefreshCw :class="['w-3 h-3', isLoading ? 'animate-spin text-emerald-400' : '']" />
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 1: Status Mesin -->
      <section v-if="currentTab === 'plant_floor'" class="space-y-4">
        <!-- 1A. Grid View -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <LineCard
            v-for="line in mergedLines"
            :key="line.id"
            :line="line"
            @change-status="handleChangeLineStatus"
            @inspect-line="handleInspectLine"
            @resolve-downtime="handleStartResolveDowntime"
          />
        </div>

        <!-- 1B. Calm Minimalist Table View -->
        <div v-else class="rounded-xl border border-zinc-800/60 bg-[#11141d]/50 overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-zinc-800/60 text-[11px] font-mono text-zinc-500 bg-[#0e1118]/50">
                <th class="py-3 px-4">Lini Mesin</th>
                <th class="py-3 px-3">Status</th>
                <th class="py-3 px-3">OEE</th>
                <th class="py-3 px-3">Kecepatan</th>
                <th class="py-3 px-3">Suhu</th>
                <th class="py-3 px-3">Daya</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/40">
              <tr 
                v-for="line in mergedLines" 
                :key="line.id"
                :class="[
                  'hover:bg-zinc-800/20 transition-colors',
                  line.current_status === 'DOWNTIME' ? 'bg-rose-950/10' : ''
                ]"
              >
                <!-- Line Name -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-medium text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/60">
                      {{ line.code }}
                    </span>
                    <span class="font-medium text-zinc-200">{{ line.name }}</span>
                  </div>
                  <div v-if="line.current_status === 'DOWNTIME' && line.active_reason_name" class="text-[11px] text-rose-300 mt-0.5">
                    {{ line.active_reason_name }} ({{ line.active_downtime_duration_seconds ? Math.floor(line.active_downtime_duration_seconds / 60) + 'm' : '' }})
                  </div>
                </td>

                <!-- Status -->
                <td class="py-3 px-3">
                  <span 
                    :class="[
                      'inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border',
                      line.current_status === 'RUNNING' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' :
                      line.current_status === 'DOWNTIME' ? 'bg-rose-950/30 text-rose-400 border-rose-500/20' :
                      line.current_status === 'IDLE' ? 'bg-amber-950/30 text-amber-400 border-amber-500/20' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700/40'
                    ]"
                  >
                    <span 
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        line.current_status === 'RUNNING' ? 'bg-emerald-400' :
                        line.current_status === 'DOWNTIME' ? 'bg-rose-400' :
                        line.current_status === 'IDLE' ? 'bg-amber-400' : 'bg-zinc-500'
                      ]"
                    ></span>
                    {{ line.current_status }}
                  </span>
                </td>

                <!-- OEE -->
                <td class="py-3 px-3 font-mono font-medium text-zinc-200">
                  {{ Number(line.today_oee || 0).toFixed(0) }}%
                </td>

                <!-- Speed -->
                <td class="py-3 px-3 font-mono text-zinc-300">
                  {{ line.speed_units_per_hour || 0 }} <span class="text-[10px] text-zinc-500">u/h</span>
                </td>

                <!-- Temp -->
                <td class="py-3 px-3 font-mono text-zinc-300">
                  {{ Number(line.temperature_c || 0).toFixed(1) }}°C
                </td>

                <!-- Power -->
                <td class="py-3 px-3 font-mono text-zinc-400">
                  {{ Number(line.power_kw || 0).toFixed(1) }} kW
                </td>

                <!-- Actions -->
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center gap-2">
                    <button
                      v-if="line.current_status === 'DOWNTIME'"
                      @click="handleStartResolveDowntime(line)"
                      class="px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-medium transition"
                    >
                      Selesaikan
                    </button>
                    <button
                      @click="handleInspectLine(line.id)"
                      class="text-zinc-400 hover:text-zinc-200 text-xs font-mono transition"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 2: Downtime & Analisis Pareto -->
      <section v-if="currentTab === 'downtime_pareto'" class="space-y-5">
        <ParetoChart
          :pareto="paretoData"
          :grand-total-minutes="paretoGrandTotal"
          :selected-days="paretoDays"
          @update-days="handleUpdateParetoDays"
        />

        <DowntimeTable
          :active-downtimes="activeDowntimes"
          :history="downtimeHistory"
          :lines="lines"
          :selected-line-filter="downtimeLineFilter"
          @acknowledge="handleAcknowledgeDowntime"
          @resolve="handleStartResolveDowntime"
          @update-line-filter="handleUpdateDowntimeFilter"
        />
      </section>

      <!-- TAB 3: Tren Output & OEE -->
      <section v-if="currentTab === 'hourly_timeline'" class="space-y-5">
        <HourlyTimelineChart :hourly="hourlyRecords" />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DefectBreakdown :defects="defectRecords" :grand-total-scrap="defectGrandTotal" />
          <ShiftComparison :shifts="shifts" />
        </div>
      </section>
    </main>

    <!-- Quiet Minimalist Footer -->
    <footer class="border-t border-zinc-900 bg-[#0a0c12] py-4 text-center text-[11px] text-zinc-600 font-mono mt-auto">
      VOLTIX • Real-Time OEE & Downtime Monitoring
    </footer>

    <!-- MODALS -->
    <LogDowntimeModal
      :is-open="isLogModalOpen"
      :lines="lines"
      :categories="categories"
      :reasons="reasons"
      @close="isLogModalOpen = false"
      @submit="handleLogDowntimeSubmit"
    />

    <ResolveDowntimeModal
      :is-open="isResolveModalOpen"
      :incident="selectedIncidentToResolve"
      @close="isResolveModalOpen = false"
      @submit="handleResolveDowntimeSubmit"
    />

    <LineDetailModal
      :is-open="isLineModalOpen"
      :details="selectedLineDetails"
      @close="isLineModalOpen = false"
    />

    <!-- Quiet Toast Notification -->
    <div 
      v-if="toastMessage" 
      class="fixed bottom-5 right-5 z-50 bg-[#12151e] border border-zinc-700/60 text-zinc-200 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 font-mono text-xs"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-400" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RefreshCw, CheckCircle2 } from 'lucide-vue-next'
import { useFactoryApi, type ProductionLine, type DashboardSummary, type ActiveDowntime, type ParetoItem } from './composables/useFactoryApi'
import { useFactoryStream } from './composables/useFactoryStream'

// Composables
const api = useFactoryApi()
const stream = useFactoryStream()

// Navigation Tabs
const tabs = [
  { id: 'plant_floor', label: 'Status Mesin' },
  { id: 'downtime_pareto', label: 'Downtime & Pareto' },
  { id: 'hourly_timeline', label: 'Tren Output & OEE' }
]
const currentTab = ref('plant_floor')
const viewMode = ref<'grid' | 'table'>('grid')

// Reactive State
const summary = ref<DashboardSummary | null>(null)
const lines = ref<ProductionLine[]>([])
const activeDowntimes = ref<ActiveDowntime[]>([])
const paretoData = ref<ParetoItem[]>([])
const paretoGrandTotal = ref(0)
const paretoDays = ref(7)
const hourlyRecords = ref<any[]>([])
const defectRecords = ref<any[]>([])
const defectGrandTotal = ref(0)
const shifts = ref<any[]>([])
const categories = ref<any[]>([])
const reasons = ref<any[]>([])
const downtimeHistory = ref<any[]>([])
const downtimeLineFilter = ref('')

// UI state
const isLoading = ref(false)
const isSimulating = ref(false)
const toastMessage = ref('')
const isLogModalOpen = ref(false)
const isResolveModalOpen = ref(false)
const selectedIncidentToResolve = ref<any | null>(null)
const isLineModalOpen = ref(false)
const selectedLineDetails = ref<any | null>(null)

// SSE Stream Binding
const isConnected = computed(() => stream.isConnected.value)
const toggleStream = () => stream.toggleStream()

// Merge lines with live SSE telemetry
const mergedLines = computed(() => {
  const liveMap = new Map(stream.liveLines.value.map(l => [l.id, l]))
  return lines.value.map(l => {
    const live = liveMap.get(l.id)
    if (!live) return l
    return {
      ...l,
      current_status: live.current_status,
      speed_units_per_hour: live.speed,
      temperature_c: live.temp,
      vibration_rms: live.vibration,
      power_kw: live.power,
      vacuum_pressure_kpa: live.vacuum,
      alert_level: live.alert_level,
      error_code: live.error_code,
      active_downtime_id: live.active_downtime_id,
      active_reason_name: live.active_reason_name,
      active_downtime_duration_seconds: live.active_duration_seconds
    }
  })
})

const currentShiftName = computed(() => {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Shift 1: Pagi (06:00 - 14:00)'
  if (h >= 14 && h < 22) return 'Shift 2: Siang (14:00 - 22:00)'
  return 'Shift 3: Malam (22:00 - 06:00)'
})

const formattedLastUpdated = computed(() => {
  const ts = stream.lastUpdated.value || new Date().toISOString()
  const d = new Date(ts)
  return d.toLocaleTimeString('id-ID', { hour12: false })
})

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

// Fetch initial data
const { data: initialData } = await useAsyncData('factory-initial-data', async () => {
  try {
    const [sumRes, linesRes, paretoRes, hourlyRes, defectRes, shiftsRes, historyRes] = await Promise.all([
      api.fetchSummary(),
      api.fetchLines(),
      api.fetchPareto(paretoDays.value),
      api.fetchHourlyAnalytics(24),
      api.fetchDefectAnalytics(7),
      api.fetchShiftAnalytics(7),
      api.fetchDowntimeHistory({ limit: 50 })
    ])
    return {
      summary: sumRes.summary,
      activeDowntimes: sumRes.active_downtimes || [],
      shifts: shiftsRes.shifts || [],
      lines: linesRes.lines || [],
      paretoData: paretoRes.pareto || [],
      paretoGrandTotal: paretoRes.grand_total_minutes || 0,
      hourlyRecords: hourlyRes.hourly || [],
      defectRecords: defectRes.defects || [],
      defectGrandTotal: defectRes.grand_total_scrap || 0,
      downtimeHistory: historyRes.history || []
    }
  } catch (err) {
    console.error('SSR fetch error:', err)
    return null
  }
})

if (initialData.value) {
  summary.value = initialData.value.summary
  activeDowntimes.value = initialData.value.activeDowntimes
  shifts.value = initialData.value.shifts
  lines.value = initialData.value.lines
  paretoData.value = initialData.value.paretoData
  paretoGrandTotal.value = initialData.value.paretoGrandTotal
  hourlyRecords.value = initialData.value.hourlyRecords
  defectRecords.value = initialData.value.defectRecords
  defectGrandTotal.value = initialData.value.defectGrandTotal
  downtimeHistory.value = initialData.value.downtimeHistory
}

// Data Fetching
const refreshData = async () => {
  isLoading.value = true
  try {
    const [sumRes, linesRes, paretoRes, hourlyRes, defectRes, shiftsRes, historyRes] = await Promise.all([
      api.fetchSummary(),
      api.fetchLines(),
      api.fetchPareto(paretoDays.value),
      api.fetchHourlyAnalytics(24),
      api.fetchDefectAnalytics(7),
      api.fetchShiftAnalytics(7),
      api.fetchDowntimeHistory({ limit: 50, lineId: downtimeLineFilter.value ? Number(downtimeLineFilter.value) : undefined })
    ])

    summary.value = sumRes.summary
    activeDowntimes.value = sumRes.active_downtimes || []
    shifts.value = shiftsRes.shifts || []
    lines.value = linesRes.lines || []
    paretoData.value = paretoRes.pareto || []
    paretoGrandTotal.value = paretoRes.grand_total_minutes || 0
    hourlyRecords.value = hourlyRes.hourly || []
    defectRecords.value = defectRes.defects || []
    defectGrandTotal.value = defectRes.grand_total_scrap || 0
    downtimeHistory.value = historyRes.history || []
  } catch (err: any) {
    console.error('Failed to load dashboard data:', err)
  } finally {
    isLoading.value = false
  }
}

// User Actions
const handleChangeLineStatus = async ({ lineId, status }: { lineId: number, status: string }) => {
  try {
    await api.setLineStatus(lineId, status)
    showToast(`Status lini diubah ke ${status}`)
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

const handleInspectLine = async (id: number) => {
  try {
    const res = await api.fetchLineDetails(id)
    selectedLineDetails.value = res
    isLineModalOpen.value = true
  } catch (err: any) {
    console.error(err)
  }
}

const handleStartResolveDowntime = (incident: any) => {
  selectedIncidentToResolve.value = incident
  isResolveModalOpen.value = true
}

const handleAcknowledgeDowntime = async (id: number) => {
  try {
    await api.acknowledgeDowntime(id)
    showToast('Insiden diakui')
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

const handleLogDowntimeSubmit = async (data: any) => {
  try {
    await api.logDowntime(data)
    isLogModalOpen.value = false
    showToast('Downtime dicatat')
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

const handleResolveDowntimeSubmit = async ({ id, resolution_notes }: { id: number, resolution_notes: string }) => {
  try {
    await api.resolveDowntime(id, resolution_notes)
    isResolveModalOpen.value = false
    showToast('Downtime diselesaikan')
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

const handleUpdateParetoDays = async (days: number) => {
  paretoDays.value = days
  const res = await api.fetchPareto(days)
  paretoData.value = res.pareto || []
  paretoGrandTotal.value = res.grand_total_minutes || 0
}

const handleUpdateDowntimeFilter = async (lineId: string) => {
  downtimeLineFilter.value = lineId
  const res = await api.fetchDowntimeHistory({
    limit: 50,
    lineId: lineId ? Number(lineId) : undefined
  })
  downtimeHistory.value = res.history || []
}

// Simulation Controls
const handleSimTick = async () => {
  isSimulating.value = true
  try {
    await api.triggerSimulationTick()
    showToast('Siklus diperbarui')
  } finally {
    isSimulating.value = false
  }
}

const handleSimFault = async () => {
  try {
    const runningLine = lines.value.find(l => l.current_status === 'RUNNING')
    const code = runningLine ? runningLine.code : 'SMT-01'
    const res = await api.triggerSimulationFault(code)
    showToast(res.message || 'Simulasi kerusakan disuntikkan')
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

const handleSimReset = async () => {
  try {
    await api.resetAllSimulation()
    showToast('Semua lini normal')
    await refreshData()
  } catch (err: any) {
    console.error(err)
  }
}

onMounted(async () => {
  await refreshData()
  try {
    const reasonsRes = await api.fetchDowntimeReasons()
    categories.value = reasonsRes.categories || []
    reasons.value = reasonsRes.reasons || []
  } catch (err) {
    console.error('Failed to load downtime reasons:', err)
  }
})
</script>
