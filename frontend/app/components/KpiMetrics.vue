<template>
  <div class="space-y-3.5">
    <!-- Active Downtime Alert (Soft, steady, non-blinking) -->
    <div 
      v-if="summary?.active_downtimes_count && summary.active_downtimes_count > 0"
      class="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-center gap-2.5">
        <span class="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
        <div class="text-zinc-300">
          <span class="font-medium text-rose-300">
            {{ summary.active_downtimes_count }} Mesin Berhenti:
          </span>
          <span class="ml-1 text-zinc-300">
            {{ activeDowntimeLinesSummary }}
          </span>
        </div>
      </div>
      <button 
        @click="$emit('view-active-downtimes')"
        class="self-start sm:self-auto px-3 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-xs transition"
      >
        Lihat Detail
      </button>
    </div>

    <!-- Unified Serene Metrics Row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-zinc-800/60 bg-[#11141d]/60 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60 p-1 sm:p-2">
      <!-- 1. OEE -->
      <div class="p-3.5 sm:p-4">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>OEE Pabrik</span>
          <span class="text-[11px] text-zinc-500 font-mono">Target {{ summary?.target_oee || 85 }}%</span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1">
          <span class="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 font-mono">
            {{ (summary?.oee || 0).toFixed(1) }}
          </span>
          <span class="text-xs text-zinc-500 font-mono">%</span>
        </div>
        <div class="mt-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 truncate">
          <span>A: {{ (summary?.availability || 0).toFixed(0) }}%</span>
          <span class="text-zinc-700">•</span>
          <span>P: {{ (summary?.performance || 0).toFixed(0) }}%</span>
          <span class="text-zinc-700">•</span>
          <span>Q: {{ (summary?.quality || 0).toFixed(0) }}%</span>
        </div>
      </div>

      <!-- 2. Output -->
      <div class="p-3.5 sm:p-4">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>Output Produksi</span>
          <span class="text-[11px] text-zinc-500 font-mono">24 Jam</span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1.5">
          <span class="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 font-mono">
            {{ (summary?.total_produced || 0).toLocaleString() }}
          </span>
          <span class="text-xs text-zinc-500">unit</span>
        </div>
        <div class="mt-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 truncate">
          <span class="text-zinc-400">{{ (summary?.total_good || 0).toLocaleString() }} baik</span>
          <span class="text-zinc-700">•</span>
          <span>{{ (summary?.total_scrap || 0).toLocaleString() }} scrap ({{ (summary?.scrap_rate || 0).toFixed(1) }}%)</span>
        </div>
      </div>

      <!-- 3. Machine Status -->
      <div class="p-3.5 sm:p-4">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>Status Mesin</span>
          <span class="text-[11px] text-zinc-500 font-mono">{{ summary?.line_status?.TOTAL || 6 }} Lini</span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1.5">
          <span class="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 font-mono">
            {{ summary?.line_status?.RUNNING || 0 }}
          </span>
          <span class="text-xs text-zinc-500">/ {{ summary?.line_status?.TOTAL || 6 }} Aktif</span>
        </div>
        <div class="mt-2 text-[11px] text-zinc-500 font-mono flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-zinc-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/90"></span>
            {{ summary?.line_status?.RUNNING || 0 }} jalan
          </span>
          <span class="text-zinc-700">•</span>
          <span class="flex items-center gap-1.5" :class="(summary?.line_status?.DOWNTIME || 0) > 0 ? 'text-rose-400' : 'text-zinc-500'">
            <span class="w-1.5 h-1.5 rounded-full" :class="(summary?.line_status?.DOWNTIME || 0) > 0 ? 'bg-rose-500' : 'bg-zinc-700'"></span>
            {{ summary?.line_status?.DOWNTIME || 0 }} henti
          </span>
        </div>
      </div>

      <!-- 4. Total Downtime -->
      <div class="p-3.5 sm:p-4">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>Downtime Hari Ini</span>
          <span class="text-[11px] text-zinc-500 font-mono">Waktu Hilang</span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1.5">
          <span class="text-2xl sm:text-3xl font-semibold tracking-tight font-mono" :class="(summary?.total_downtime_mins || 0) > 0 ? 'text-amber-400/90' : 'text-zinc-100'">
            {{ summary?.total_downtime_mins || 0 }}
          </span>
          <span class="text-xs text-zinc-500">menit</span>
        </div>
        <div class="mt-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 truncate">
          <span>MTTR: {{ summary?.mttr_minutes || 0 }}m</span>
          <span class="text-zinc-700">•</span>
          <span>MTBF: {{ summary?.mtbf_hours || 0 }}j</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardSummary, ActiveDowntime } from '../composables/useFactoryApi'

const props = defineProps<{
  summary: DashboardSummary | null
  activeDowntimes: ActiveDowntime[]
}>()

defineEmits(['view-active-downtimes'])

const activeDowntimeLinesSummary = computed(() => {
  if (!props.activeDowntimes || props.activeDowntimes.length === 0) return 'Tidak ada'
  return props.activeDowntimes.map(d => `${d.line_code} (${d.reason_name || 'Gangguan Mesin'})`).join(', ')
})
</script>
