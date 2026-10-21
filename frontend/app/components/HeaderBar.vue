<template>
  <header class="border-b border-zinc-800/50 bg-[#0c0e14]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <!-- Title & Live Status -->
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
          <Activity class="w-3.5 h-3.5 text-emerald-400/90" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-semibold tracking-tight text-zinc-100">
              VOLTIX
            </h1>
            <span class="text-zinc-600 text-xs">•</span>
            <span class="text-xs text-zinc-400 font-normal">Monitoring OEE & Downtime</span>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
            <span>{{ activeShiftName || 'Shift 1' }}</span>
            <span class="text-zinc-700">•</span>
            <span>{{ currentTime }}</span>
            <span class="text-zinc-700">•</span>
            <span class="flex items-center gap-1.5" :class="isStreamConnected ? 'text-zinc-400' : 'text-zinc-500'">
              <span class="w-1.5 h-1.5 rounded-full" :class="isStreamConnected ? 'bg-emerald-500' : 'bg-zinc-600'"></span>
              <span>{{ isStreamConnected ? 'Live' : 'Terputus' }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <!-- Discreet Simulation Controls (Dropdown) -->
        <div class="relative">
          <button
            @click="isSimMenuOpen = !isSimMenuOpen"
            class="px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 transition"
            title="Menu alat simulasi data"
          >
            <SlidersHorizontal class="w-3.5 h-3.5 text-zinc-500" />
            <span class="hidden sm:inline">Simulasi</span>
            <ChevronDown class="w-3 h-3 text-zinc-500" />
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="isSimMenuOpen"
            class="absolute right-0 mt-1.5 w-48 rounded-xl border border-zinc-800 bg-[#12151e] shadow-xl p-1 z-50 text-xs"
          >
            <div class="px-2.5 py-1 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              Uji Coba Data
            </div>
            <button
              @click="$emit('sim-tick'); isSimMenuOpen = false"
              :disabled="isSimulating"
              class="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw :class="['w-3.5 h-3.5 text-zinc-400', isSimulating ? 'animate-spin' : '']" />
              <span>Perbarui Siklus</span>
            </button>
            <button
              @click="$emit('sim-fault'); isSimMenuOpen = false"
              class="w-full text-left px-2.5 py-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 flex items-center gap-2 transition"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-amber-400" />
              <span>Simulasi Kerusakan</span>
            </button>
            <button
              @click="$emit('sim-reset'); isSimMenuOpen = false"
              class="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 flex items-center gap-2 transition"
            >
              <RotateCcw class="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Normal</span>
            </button>
            <div class="border-t border-zinc-800/80 my-1"></div>
            <button
              @click="$emit('toggle-stream'); isSimMenuOpen = false"
              class="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 flex items-center gap-2 transition"
            >
              <Radio class="w-3.5 h-3.5" :class="isStreamConnected ? 'text-emerald-400' : 'text-zinc-500'" />
              <span>{{ isStreamConnected ? 'Jeda Stream' : 'Hubungkan Stream' }}</span>
            </button>
          </div>
        </div>

        <!-- Primary Action: Log Downtime -->
        <button
          @click="$emit('open-log-modal')"
          class="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus class="w-3.5 h-3.5 text-zinc-400" />
          <span>Catat Downtime</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Activity, Plus, SlidersHorizontal, ChevronDown, RefreshCw, AlertTriangle, RotateCcw, Radio } from 'lucide-vue-next'

const props = defineProps<{
  isStreamConnected: boolean
  isSimulating?: boolean
  activeShiftName?: string
}>()

defineEmits(['toggle-stream', 'sim-tick', 'sim-fault', 'sim-reset', 'open-log-modal'])

const isSimMenuOpen = ref(false)
const currentTime = ref('')
let timer: any = null

const updateClock = () => {
  const d = new Date()
  currentTime.value = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
  
  const closeMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      isSimMenuOpen.value = false
    }
  }
  window.addEventListener('click', closeMenu)
  onUnmounted(() => window.removeEventListener('click', closeMenu))
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
