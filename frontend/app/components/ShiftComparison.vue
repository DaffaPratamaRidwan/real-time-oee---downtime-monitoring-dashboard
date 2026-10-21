<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Users2 class="w-4 h-4 text-purple-400" />
          Shift Performance Comparison
        </h3>
        <p class="text-xs text-gray-400 mt-1">
          Historical 7-day average metrics across operational shifts
        </p>
      </div>
      <span class="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
        3 Shifts / 24h
      </span>
    </div>

    <!-- 3 Shift Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div 
        v-for="shift in shifts" 
        :key="shift.id"
        class="p-4 rounded-xl border border-gray-800/90 bg-gray-950/60 flex flex-col justify-between hover:border-purple-500/40 transition"
      >
        <div>
          <!-- Shift Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-gray-200 uppercase">
              {{ shift.name }}
            </span>
            <span class="text-[11px] font-mono text-gray-400">
              {{ shift.start_time.slice(0, 5) }} - {{ shift.end_time.slice(0, 5) }}
            </span>
          </div>

          <!-- OEE Big Score -->
          <div class="mt-3 flex items-baseline justify-between border-b border-gray-800 pb-3">
            <div>
              <div class="text-[10px] uppercase font-mono text-gray-500">Average OEE</div>
              <div class="text-2xl font-bold font-mono text-white mt-0.5">
                {{ Number(shift.avg_oee || 0).toFixed(1) }}%
              </div>
            </div>
            <span :class="[
              'text-xs font-mono px-2 py-0.5 rounded border font-semibold',
              (shift.avg_oee || 0) >= 82 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            ]">
              {{ (shift.avg_oee || 0) >= 82 ? 'OPTIMAL' : 'WATCH' }}
            </span>
          </div>

          <!-- Factors List -->
          <div class="mt-3 space-y-1.5 text-xs font-mono">
            <div class="flex justify-between text-gray-400">
              <span>Availability:</span>
              <span class="text-blue-400 font-semibold">{{ Number(shift.avg_availability || 0).toFixed(1) }}%</span>
            </div>
            <div class="flex justify-between text-gray-400">
              <span>Performance:</span>
              <span class="text-emerald-400 font-semibold">{{ Number(shift.avg_performance || 0).toFixed(1) }}%</span>
            </div>
            <div class="flex justify-between text-gray-400">
              <span>Quality:</span>
              <span class="text-purple-400 font-semibold">{{ Number(shift.avg_quality || 0).toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <!-- Shift Output & Downtime Footer -->
        <div class="mt-4 pt-3 border-t border-gray-800/80 text-[11px] font-mono flex items-center justify-between text-gray-400">
          <div>
            <span>Produced: </span>
            <span class="text-gray-200 font-bold">{{ (shift.total_produced || 0).toLocaleString() }}</span>
          </div>
          <div>
            <span>Downtime: </span>
            <span class="text-amber-400 font-bold">{{ Math.round((shift.total_downtime_mins || 0) / 60) }}h</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users2 } from 'lucide-vue-next'

defineProps<{
  shifts: any[]
}>()
</script>
