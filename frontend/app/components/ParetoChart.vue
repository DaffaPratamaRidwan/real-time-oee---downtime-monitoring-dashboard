<template>
  <div class="rounded-xl border border-zinc-800/60 bg-[#11141d]/50 p-4 sm:p-5">
    <!-- Header with Filters & Legend -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Analisis Pareto Downtime (80/20)
          </h3>
          <span class="text-[11px] px-2 py-0.5 rounded bg-zinc-800/70 text-zinc-300 font-mono">
            Total: {{ grandTotalMinutes }} m
          </span>
        </div>
        <p class="text-[11px] text-zinc-500 mt-0.5">
          Urutan penyebab kegagalan dengan dampak terbesar
        </p>
      </div>

      <!-- Timeframe Selector -->
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-zinc-500 font-mono">Rentang:</span>
        <div class="inline-flex rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-0.5 text-xs font-mono">
          <button 
            v-for="d in [1, 7, 30]" 
            :key="d"
            @click="$emit('update-days', d)"
            :class="[
              'px-2.5 py-1 rounded transition-colors',
              selectedDays === d ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'
            ]"
          >
            {{ d === 1 ? '24 Jam' : `${d} Hari` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pareto Chart SVG Container -->
    <div v-if="pareto && pareto.length > 0" class="relative">
      <div class="overflow-x-auto">
        <div class="min-w-[620px] h-[300px] relative">
          <svg class="w-full h-full" :viewBox="`0 0 ${chartWidth} ${chartHeight}`">
            <!-- Grid Lines -->
            <g class="stroke-zinc-800/50" stroke-width="1" stroke-dasharray="3 3">
              <line v-for="tick in yTicks" :key="tick.value" :x1="margin.left" :y1="tick.y" :x2="chartWidth - margin.right" :y2="tick.y" />
            </g>

            <!-- 80% Pareto Reference Line -->
            <line 
              :x1="margin.left" 
              :y1="y80" 
              :x2="chartWidth - margin.right" 
              :y2="y80" 
              stroke="#eab308" 
              stroke-opacity="0.7"
              stroke-width="1.5" 
              stroke-dasharray="4 4" 
            />
            <text :x="chartWidth - margin.right - 8" :y="y80 - 6" text-anchor="end" class="text-[10px] font-mono fill-amber-400/80 font-medium">
              Batas 80% (Vital Few)
            </text>

            <!-- Y-Axis (Left: Minutes) -->
            <g class="text-[10px] font-mono fill-zinc-500">
              <text v-for="tick in yTicks" :key="tick.value" :x="margin.left - 8" :y="tick.y + 3" text-anchor="end">
                {{ tick.value }}m
              </text>
            </g>

            <!-- Y-Axis (Right: Cumulative %) -->
            <g class="text-[10px] font-mono fill-zinc-500">
              <text v-for="p in [0, 25, 50, 75, 100]" :key="p" :x="chartWidth - margin.right + 8" :y="margin.top + (1 - p / 100) * plotHeight + 3" text-anchor="start">
                {{ p }}%
              </text>
            </g>

            <!-- Bars for Each Downtime Reason -->
            <g v-for="(item, idx) in chartData" :key="item.reason_id">
              <rect
                :x="item.x"
                :y="item.y"
                :width="item.barWidth"
                :height="item.barHeight"
                :fill="item.category_color || '#475569'"
                class="transition-opacity duration-150 opacity-75 hover:opacity-100 cursor-pointer"
                rx="2"
                @mouseenter="hoveredItem = item"
                @mouseleave="hoveredItem = null"
              />
              <text 
                v-if="item.barHeight > 20" 
                :x="item.x + item.barWidth / 2" 
                :y="item.y - 4" 
                text-anchor="middle" 
                class="text-[9px] font-mono fill-zinc-400 font-medium"
              >
                {{ item.total_minutes }}m
              </text>
            </g>

            <!-- Cumulative Percentage Line -->
            <path
              :d="cumulativePath"
              fill="none"
              stroke="#10b981"
              stroke-opacity="0.85"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Cumulative Points -->
            <circle
              v-for="item in chartData"
              :key="'pt-' + item.reason_id"
              :cx="item.x + item.barWidth / 2"
              :cy="item.cumY"
              r="3"
              fill="#064e3b"
              stroke="#10b981"
              stroke-width="1.5"
              class="cursor-pointer hover:scale-125 transition-transform"
              @mouseenter="hoveredItem = item"
              @mouseleave="hoveredItem = null"
            />

            <!-- X-Axis Labels -->
            <g class="text-[10px] font-mono fill-zinc-400">
              <text
                v-for="item in chartData"
                :key="'lbl-' + item.reason_id"
                :x="item.x + item.barWidth / 2"
                :y="chartHeight - margin.bottom + 16"
                text-anchor="end"
                :transform="`rotate(-30, ${item.x + item.barWidth / 2}, ${chartHeight - margin.bottom + 16})`"
                class="truncate select-none cursor-pointer hover:fill-emerald-400 transition-colors"
              >
                {{ truncateName(item.reason_name, 20) }}
              </text>
            </g>
          </svg>

          <!-- Interactive Tooltip -->
          <div 
            v-if="hoveredItem" 
            class="absolute top-2 left-1/2 -translate-x-1/2 bg-[#12151e] border border-zinc-700/70 p-2.5 rounded-lg shadow-xl text-xs z-20 pointer-events-none flex items-center gap-4"
          >
            <div>
              <div class="font-medium text-zinc-100 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: hoveredItem.category_color }"></span>
                {{ hoveredItem.reason_name }}
              </div>
              <div class="text-[10px] text-zinc-400 mt-0.5">
                Kategori: {{ hoveredItem.category_name }}
              </div>
            </div>
            <div class="border-l border-zinc-800 pl-3 font-mono text-right">
              <div class="text-emerald-400 font-semibold">{{ hoveredItem.total_minutes }} m ({{ hoveredItem.occurrences }}x)</div>
              <div class="text-zinc-500 text-[10px]">Kumulatif: {{ hoveredItem.cumulative_percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-10 text-zinc-500 text-xs font-mono">
      Tidak ada data downtime dalam rentang waktu yang dipilih.
    </div>

    <!-- Pareto Legend -->
    <div class="mt-3 pt-3 border-t border-zinc-800/50 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 gap-3 font-mono">
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded bg-zinc-600"></span>
          <span>Durasi (m)</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-emerald-500/80"></span>
          <span>Dampak Kumulatif %</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 border-t border-dashed border-amber-400/80"></span>
          <span>Batas 80%</span>
        </span>
      </div>
      <div>
        Aturan 80/20: Prioritaskan perbaikan di sebelah kiri batas 80%.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ParetoItem } from '../composables/useFactoryApi'

const props = defineProps<{
  pareto: ParetoItem[]
  grandTotalMinutes: number
  selectedDays: number
}>()

defineEmits(['update-days'])

const hoveredItem = ref<any | null>(null)

const chartWidth = 720
const chartHeight = 300
const margin = { top: 20, right: 45, bottom: 80, left: 45 }
const plotWidth = chartWidth - margin.left - margin.right
const plotHeight = chartHeight - margin.top - margin.bottom

const maxMinutes = computed(() => {
  if (!props.pareto || props.pareto.length === 0) return 100
  const max = Math.max(...props.pareto.map(p => p.total_minutes))
  return Math.ceil(max * 1.15)
})

const yTicks = computed(() => {
  const max = maxMinutes.value
  const step = Math.ceil(max / 4)
  return [0, 1, 2, 3, 4].map(i => {
    const val = i * step
    const y = margin.top + (1 - val / max) * plotHeight
    return { value: val, y }
  })
})

const y80 = computed(() => {
  return margin.top + (1 - 0.8) * plotHeight
})

const chartData = computed(() => {
  if (!props.pareto || props.pareto.length === 0) return []
  const n = props.pareto.length
  const colWidth = plotWidth / n
  const barWidth = Math.max(10, colWidth * 0.7)

  return props.pareto.map((item, idx) => {
    const x = margin.left + idx * colWidth + (colWidth - barWidth) / 2
    const h = (item.total_minutes / maxMinutes.value) * plotHeight
    const y = margin.top + plotHeight - h
    const cumY = margin.top + (1 - item.cumulative_percentage / 100) * plotHeight

    return {
      ...item,
      x,
      y,
      barWidth,
      barHeight: Math.max(2, h),
      cumY
    }
  })
})

const cumulativePath = computed(() => {
  const data = chartData.value
  if (data.length === 0) return ''
  return data.map((d, idx) => {
    const ptX = d.x + d.barWidth / 2
    const ptY = d.cumY
    return `${idx === 0 ? 'M' : 'L'} ${ptX} ${ptY}`
  }).join(' ')
})

const truncateName = (name: string, maxLen = 18) => {
  if (!name) return ''
  return name.length > maxLen ? name.slice(0, maxLen) + '...' : name
}
</script>
