<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Clock class="w-4 h-4 text-blue-400" />
          Hourly Production & OEE Profile
        </h3>
        <p class="text-xs text-gray-400 mt-1">
          Target output vs actual production units and scrap per hour
        </p>
      </div>

      <!-- Quick Metrics Summary -->
      <div class="flex items-center gap-4 text-xs font-mono">
        <span class="flex items-center gap-1.5 text-blue-400">
          <span class="w-2.5 h-2.5 rounded bg-blue-500"></span>
          <span>Actual</span>
        </span>
        <span class="flex items-center gap-1.5 text-gray-400">
          <span class="w-2.5 h-2.5 rounded bg-gray-700"></span>
          <span>Target</span>
        </span>
        <span class="flex items-center gap-1.5 text-red-400">
          <span class="w-2.5 h-2.5 rounded bg-red-500"></span>
          <span>Scrap</span>
        </span>
        <span class="flex items-center gap-1.5 text-emerald-400">
          <span class="w-3 h-0.5 bg-emerald-400"></span>
          <span>OEE %</span>
        </span>
      </div>
    </div>

    <!-- Responsive SVG Chart -->
    <div v-if="hourly && hourly.length > 0" class="overflow-x-auto">
      <div class="min-w-[600px] h-[260px] relative">
        <svg class="w-full h-full" :viewBox="`0 0 ${chartWidth} ${chartHeight}`">
          <!-- Background Grid lines -->
          <g class="stroke-gray-800/80" stroke-width="1" stroke-dasharray="3 3">
            <line v-for="tick in yTicks" :key="tick.value" :x1="margin.left" :y1="tick.y" :x2="chartWidth - margin.right" :y2="tick.y" />
          </g>

          <!-- Y Axis (Units) -->
          <g class="text-[9px] font-mono fill-gray-500">
            <text v-for="tick in yTicks" :key="tick.value" :x="margin.left - 6" :y="tick.y + 3" text-anchor="end">
              {{ tick.value }}
            </text>
          </g>

          <!-- Y Axis Right (OEE %) -->
          <g class="text-[9px] font-mono fill-gray-500">
            <text v-for="p in [0, 50, 100]" :key="p" :x="chartWidth - margin.right + 6" :y="margin.top + (1 - p / 100) * plotHeight + 3" text-anchor="start">
              {{ p }}%
            </text>
          </g>

          <!-- Bars: Target vs Actual vs Scrap -->
          <g v-for="(item, idx) in chartData" :key="idx">
            <!-- Target outline bar -->
            <rect
              :x="item.x"
              :y="item.targetY"
              :width="item.barWidth"
              :height="item.targetH"
              fill="#1e293b"
              rx="2"
              class="opacity-60"
            />
            <!-- Actual output bar -->
            <rect
              :x="item.x"
              :y="item.actualY"
              :width="item.barWidth"
              :height="item.actualH"
              fill="#3b82f6"
              rx="2"
              class="hover:fill-blue-400 transition-colors cursor-pointer"
              @mouseenter="hoveredBar = item"
              @mouseleave="hoveredBar = null"
            />
            <!-- Scrap unit indicator on top/side -->
            <rect
              v-if="item.scrap_units > 0"
              :x="item.x"
              :y="item.actualY"
              :width="item.barWidth"
              :height="item.scrapH"
              fill="#ef4444"
              rx="1"
            />
          </g>

          <!-- OEE Line overlay -->
          <path
            :d="oeePath"
            fill="none"
            stroke="#10b981"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- OEE points -->
          <circle
            v-for="(item, idx) in chartData"
            :key="'oee-' + idx"
            :cx="item.x + item.barWidth / 2"
            :cy="item.oeeY"
            r="3"
            fill="#10b981"
            class="hover:r-5 transition-all cursor-pointer"
            @mouseenter="hoveredBar = item"
            @mouseleave="hoveredBar = null"
          />

          <!-- X Axis Hour Labels -->
          <g class="text-[9px] font-mono fill-gray-400">
            <text
              v-for="(item, idx) in chartData"
              :key="'x-' + idx"
              :x="item.x + item.barWidth / 2"
              :y="chartHeight - margin.bottom + 14"
              text-anchor="middle"
            >
              {{ item.hour_label }}
            </text>
          </g>
        </svg>

        <!-- Hover Tooltip -->
        <div 
          v-if="hoveredBar" 
          class="absolute top-2 right-4 bg-gray-950/95 border border-blue-500/50 p-2 rounded-lg shadow-xl text-xs font-mono z-20 pointer-events-none"
        >
          <div class="text-white font-bold flex items-center justify-between gap-3">
            <span>Hour: {{ hoveredBar.hour_label }}</span>
            <span class="text-emerald-400 font-bold">OEE: {{ hoveredBar.oee }}%</span>
          </div>
          <div class="text-gray-300 text-[11px] mt-1 space-y-0.5">
            <div>Actual: <span class="text-blue-400 font-bold">{{ hoveredBar.actual_units }}</span> / Target: {{ hoveredBar.target_units }}</div>
            <div>Scrap: <span class="text-red-400 font-bold">{{ hoveredBar.scrap_units }}</span> | Downtime: {{ hoveredBar.downtime_mins }}m</div>
            <div class="text-[10px] text-gray-500">Avail: {{ hoveredBar.availability }}% | Perf: {{ hoveredBar.performance }}% | Qual: {{ hoveredBar.quality }}%</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-10 text-gray-500 text-xs font-mono">
      No hourly records loaded.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock } from 'lucide-vue-next'

const props = defineProps<{
  hourly: any[]
}>()

const hoveredBar = ref<any | null>(null)

const chartWidth = 720
const chartHeight = 240
const margin = { top: 20, right: 35, bottom: 40, left: 45 }
const plotWidth = chartWidth - margin.left - margin.right
const plotHeight = chartHeight - margin.top - margin.bottom

const maxUnits = computed(() => {
  if (!props.hourly || props.hourly.length === 0) return 500
  const max = Math.max(...props.hourly.map(h => Math.max(h.actual_units || 0, h.target_units || 0)))
  return Math.ceil(Math.max(100, max) * 1.15)
})

const yTicks = computed(() => {
  const max = maxUnits.value
  const step = Math.ceil(max / 3)
  return [0, 1, 2, 3].map(i => {
    const val = i * step
    const y = margin.top + (1 - val / max) * plotHeight
    return { value: val, y }
  })
})

const chartData = computed(() => {
  if (!props.hourly || props.hourly.length === 0) return []
  const n = props.hourly.length
  const colWidth = plotWidth / n
  const barWidth = Math.max(8, colWidth * 0.65)

  return props.hourly.map((item, idx) => {
    const x = margin.left + idx * colWidth + (colWidth - barWidth) / 2
    const actualH = ((item.actual_units || 0) / maxUnits.value) * plotHeight
    const actualY = margin.top + plotHeight - actualH

    const targetH = ((item.target_units || 0) / maxUnits.value) * plotHeight
    const targetY = margin.top + plotHeight - targetH

    const scrapH = ((item.scrap_units || 0) / maxUnits.value) * plotHeight

    const oeeY = margin.top + (1 - Math.min(100, item.oee || 0) / 100) * plotHeight

    return {
      ...item,
      x,
      barWidth,
      actualH: Math.max(2, actualH),
      actualY,
      targetH: Math.max(2, targetH),
      targetY,
      scrapH: Math.max(2, scrapH),
      oeeY
    }
  })
})

const oeePath = computed(() => {
  const data = chartData.value
  if (data.length === 0) return ''
  return data.map((d, idx) => {
    const ptX = d.x + d.barWidth / 2
    const ptY = d.oeeY
    return `${idx === 0 ? 'M' : 'L'} ${ptX} ${ptY}`
  }).join(' ')
})
</script>
