<template>
  <div 
    :class="[
      'rounded-xl border transition-colors duration-150 p-4 flex flex-col justify-between',
      line.current_status === 'RUNNING' ? 'border-zinc-800/60 bg-[#11141d]/50 hover:border-zinc-700/60' :
      line.current_status === 'DOWNTIME' ? 'border-rose-500/30 bg-rose-950/15' :
      line.current_status === 'IDLE' ? 'border-amber-500/25 bg-amber-950/10' :
      'border-zinc-800/60 bg-[#11141d]/50'
    ]"
  >
    <!-- Top Row: Line Code, Name & Status -->
    <div>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
              {{ line.code }}
            </span>
            <span class="text-[11px] text-zinc-500 truncate">
              {{ line.department_code }}
            </span>
          </div>
          <h3 class="text-sm font-medium text-zinc-200 mt-1.5 truncate" :title="line.name">
            {{ line.name }}
          </h3>
        </div>

        <!-- Calm, Steady Status Badge -->
        <span 
          :class="[
            'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0',
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
          {{ statusLabel(line.current_status) }}
        </span>
      </div>

      <!-- Downtime Notification Bar (If stopped) -->
      <div 
        v-if="line.current_status === 'DOWNTIME'"
        class="mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs"
      >
        <div class="flex items-center justify-between text-[11px] text-rose-300">
          <span class="truncate font-medium">{{ line.active_reason_name || 'Gangguan Mesin' }}</span>
          <span class="font-mono font-semibold shrink-0 ml-1.5">{{ formattedActiveDuration }}</span>
        </div>
        <button 
          @click.stop="$emit('resolve-downtime', line)"
          class="w-full mt-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-medium transition"
        >
          Selesaikan Insiden
        </button>
      </div>

      <!-- 3 Key Metrics (Clean Typography, No Heavy Boxes) -->
      <div class="mt-4 grid grid-cols-3 gap-2 py-2 border-y border-zinc-800/40 text-center">
        <!-- OEE -->
        <div>
          <div class="text-[10px] text-zinc-500 font-mono">OEE</div>
          <div 
            :class="[
              'text-sm font-mono font-semibold mt-0.5',
              line.today_oee >= line.target_oee ? 'text-emerald-400/90' : 'text-zinc-200'
            ]"
          >
            {{ Number(line.today_oee || 0).toFixed(0) }}%
          </div>
        </div>

        <!-- Speed -->
        <div>
          <div class="text-[10px] text-zinc-500 font-mono">Kecepatan</div>
          <div class="text-sm font-mono font-medium text-zinc-200 mt-0.5">
            {{ line.speed_units_per_hour || 0 }} <span class="text-[9px] text-zinc-500">u/h</span>
          </div>
        </div>

        <!-- Temperature -->
        <div>
          <div class="text-[10px] text-zinc-500 font-mono">Suhu</div>
          <div class="text-sm font-mono font-medium text-zinc-300 mt-0.5">
            {{ Number(line.temperature_c || 0).toFixed(1) }}°C
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Actions: Status Select & Detail Button -->
    <div class="mt-3 pt-2.5 flex items-center justify-between gap-2">
      <select 
        :value="line.current_status"
        @change="$emit('change-status', { lineId: line.id, status: ($event.target as HTMLSelectElement).value })"
        class="bg-zinc-800/50 text-[11px] text-zinc-400 hover:text-zinc-200 rounded px-2 py-1 border border-zinc-700/50 hover:border-zinc-600 focus:outline-none cursor-pointer transition"
      >
        <option value="RUNNING">RUNNING</option>
        <option value="IDLE">IDLE</option>
        <option value="DOWNTIME">DOWNTIME</option>
        <option value="MAINTENANCE">MAINTENANCE</option>
      </select>

      <button
        @click="$emit('inspect-line', line.id)"
        class="px-2.5 py-1 rounded hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition"
        title="Lihat telemetri lengkap"
      >
        Detail →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductionLine } from '../composables/useFactoryApi'

const props = defineProps<{
  line: ProductionLine
}>()

defineEmits(['change-status', 'inspect-line', 'resolve-downtime'])

const activeDowntimeSeconds = computed(() => {
  return props.line.active_downtime_duration_seconds || 0
})

const formattedActiveDuration = computed(() => {
  const sec = activeDowntimeSeconds.value
  if (sec < 60) return `${sec}d`
  const mins = Math.floor(sec / 60)
  const remainingSec = sec % 60
  if (mins < 60) return `${mins}m ${remainingSec}d`
  const hrs = Math.floor(mins / 60)
  return `${hrs}j ${mins % 60}m`
})

const statusLabel = (status: string) => {
  switch (status) {
    case 'RUNNING': return 'Berjalan'
    case 'DOWNTIME': return 'Berhenti'
    case 'IDLE': return 'Siaga'
    case 'MAINTENANCE': return 'Perawatan'
    default: return status
  }
}
</script>
