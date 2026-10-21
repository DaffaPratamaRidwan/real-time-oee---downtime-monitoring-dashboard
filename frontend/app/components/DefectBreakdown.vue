<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <ShieldAlert class="w-4 h-4 text-rose-400" />
          Scrap & Defect Root Cause Analysis
        </h3>
        <p class="text-xs text-gray-400 mt-1">
          Electrical inspection reject classification & First-Pass Yield (FPY) loss
        </p>
      </div>

      <span class="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
        Total Scrap: {{ grandTotalScrap }} units
      </span>
    </div>

    <!-- Defect Bars List -->
    <div v-if="defects && defects.length > 0" class="space-y-3.5 mt-2">
      <div v-for="(defect, idx) in defects" :key="idx" class="text-xs">
        <div class="flex items-center justify-between mb-1.5 font-medium">
          <div class="flex items-center gap-2 text-gray-200">
            <span class="w-2 h-2 rounded-full" :class="getDefectColor(idx)"></span>
            <span class="font-semibold">{{ defect.scrap_reason }}</span>
          </div>
          <div class="font-mono text-right flex items-center gap-3">
            <span class="text-gray-400">{{ defect.occurrence_count }} incidents</span>
            <span class="text-rose-400 font-bold">{{ defect.total_scrap_units }} rejects</span>
            <span class="text-gray-300 w-12 text-right font-semibold">{{ defect.percentage }}%</span>
          </div>
        </div>

        <!-- Visual Progress Bar -->
        <div class="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden">
          <div 
            class="h-2 rounded-full transition-all duration-500"
            :class="getDefectBarBg(idx)"
            :style="{ width: `${defect.percentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500 text-xs font-mono">
      No defect records recorded in this timeframe.
    </div>

    <div class="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
      <span>Quality Standard: IPC-A-610 Class 3</span>
      <span class="text-emerald-400">Target FPY: &gt; 98.5%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'

defineProps<{
  defects: any[]
  grandTotalScrap: number
}>()

const getDefectColor = (idx: number) => {
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-indigo-500']
  return colors[idx % colors.length]
}

const getDefectBarBg = (idx: number) => {
  const bgs = [
    'bg-gradient-to-r from-rose-600 to-rose-400',
    'bg-gradient-to-r from-amber-600 to-amber-400',
    'bg-gradient-to-r from-purple-600 to-purple-400',
    'bg-gradient-to-r from-blue-600 to-blue-400',
    'bg-gradient-to-r from-cyan-600 to-cyan-400',
    'bg-gradient-to-r from-indigo-600 to-indigo-400'
  ]
  return bgs[idx % bgs.length]
}
</script>
