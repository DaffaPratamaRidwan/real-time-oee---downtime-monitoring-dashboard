<template>
  <div v-if="isOpen && details" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl text-left">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-800">
        <div class="flex items-center gap-3">
          <span class="text-xs font-mono font-bold px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-700">
            {{ details.line?.code }}
          </span>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              {{ details.line?.name }}
              <span :class="[
                'text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase',
                details.line?.current_status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                details.line?.current_status === 'DOWNTIME' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                'bg-amber-500/20 text-amber-400 border-amber-500/30'
              ]">
                {{ details.line?.current_status }}
              </span>
            </h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ details.line?.department_name }} • {{ details.line?.description }}</p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Line Specifications & Product Info -->
      <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-gray-950 border border-gray-800">
          <div class="text-gray-500 text-[11px]">Product SKU</div>
          <div class="font-bold text-white font-mono mt-0.5">{{ details.line?.product_code }}</div>
          <div class="text-gray-400 text-[10px] truncate" :title="details.line?.product_name">{{ details.line?.product_name }}</div>
        </div>

        <div class="p-3 rounded-xl bg-gray-950 border border-gray-800">
          <div class="text-gray-500 text-[11px]">Standard Cycle Time</div>
          <div class="font-bold text-emerald-400 font-mono mt-0.5">{{ details.line?.standard_cycle_time_sec }}s / unit</div>
          <div class="text-gray-400 text-[10px]">Ideal: {{ details.line?.ideal_units_per_hour }} u/h</div>
        </div>

        <div class="p-3 rounded-xl bg-gray-950 border border-gray-800">
          <div class="text-gray-500 text-[11px]">Target OEE</div>
          <div class="font-bold text-white font-mono mt-0.5">{{ details.line?.target_oee }}%</div>
          <div class="text-gray-400 text-[10px]">Target World-Class: 85%</div>
        </div>

        <div class="p-3 rounded-xl bg-gray-950 border border-gray-800">
          <div class="text-gray-500 text-[11px]">Assigned Operator</div>
          <div class="font-bold text-white mt-0.5">{{ details.line?.operator_name || 'Unassigned' }}</div>
          <div class="text-gray-400 text-[10px]">Lead Technician</div>
        </div>
      </div>

      <!-- Recent 24h Hourly Profile for this Line -->
      <div class="mt-6">
        <h4 class="text-xs font-bold uppercase font-mono tracking-wider text-gray-300 mb-2">
          24-Hour Production & OEE Record
        </h4>
        <div class="overflow-x-auto max-h-48 border border-gray-800 rounded-xl bg-gray-950">
          <table class="w-full text-left text-xs font-mono">
            <thead class="sticky top-0 bg-gray-900 border-b border-gray-800 text-[10px] text-gray-400 uppercase">
              <tr>
                <th class="p-2">Time</th>
                <th class="p-2">OEE</th>
                <th class="p-2">Avail</th>
                <th class="p-2">Perf</th>
                <th class="p-2">Qual</th>
                <th class="p-2">Produced</th>
                <th class="p-2">Scrap</th>
                <th class="p-2">Downtime</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800/60 text-[11px]">
              <tr v-for="r in details.hourly_records" :key="r.record_timestamp" class="hover:bg-gray-900/50">
                <td class="p-2 text-gray-400">{{ formatHour(r.record_timestamp) }}</td>
                <td class="p-2 font-bold" :class="r.oee >= 85 ? 'text-emerald-400' : 'text-amber-400'">{{ r.oee }}%</td>
                <td class="p-2 text-blue-400">{{ r.availability }}%</td>
                <td class="p-2 text-emerald-400">{{ r.performance }}%</td>
                <td class="p-2 text-purple-400">{{ r.quality }}%</td>
                <td class="p-2 text-gray-200">{{ r.actual_units }} / {{ r.target_units }}</td>
                <td class="p-2 text-rose-400">{{ r.scrap_units }}</td>
                <td class="p-2 text-amber-400">{{ r.downtime_mins }}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Downtime Incidents for this Line -->
      <div class="mt-6">
        <h4 class="text-xs font-bold uppercase font-mono tracking-wider text-gray-300 mb-2">
          Recent Stoppage History
        </h4>
        <div class="overflow-x-auto max-h-44 border border-gray-800 rounded-xl bg-gray-950">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-gray-900 border-b border-gray-800 text-[10px] font-mono text-gray-400 uppercase">
              <tr>
                <th class="p-2">Time</th>
                <th class="p-2">Failure Reason</th>
                <th class="p-2">Status</th>
                <th class="p-2">Duration</th>
                <th class="p-2">Action Taken</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800/60 font-mono text-[11px]">
              <tr v-for="d in details.recent_downtimes" :key="d.id" class="hover:bg-gray-900/50">
                <td class="p-2 text-gray-400">{{ formatHour(d.start_time) }}</td>
                <td class="p-2 font-sans text-gray-200 font-medium">{{ d.reason_name }}</td>
                <td class="p-2">
                  <span :class="[
                    'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                    d.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  ]">
                    {{ d.status }}
                  </span>
                </td>
                <td class="p-2 text-amber-400 font-bold">
                  {{ Math.round((d.duration_seconds || 0) / 60) }}m
                </td>
                <td class="p-2 font-sans text-gray-300 text-xs truncate max-w-xs" :title="d.resolution_notes || d.operator_notes">
                  {{ d.resolution_notes || d.operator_notes || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Close Button -->
      <div class="mt-6 pt-4 border-t border-gray-800 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
  details: any | null
}>()

defineEmits(['close'])

const formatHour = (ts: string) => {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>
