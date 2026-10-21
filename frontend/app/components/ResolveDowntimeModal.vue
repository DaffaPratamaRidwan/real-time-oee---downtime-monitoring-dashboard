<template>
  <div v-if="isOpen && incident" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl text-left">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-800">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Resolve Stoppage & Resume Line</h3>
            <p class="text-xs text-gray-400">Complete incident log and restore workstation</p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Incident Context Summary -->
      <div class="mt-4 p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-gray-400">Production Line:</span>
          <span class="font-bold text-white font-mono">{{ incident.line_code }} - {{ incident.line_name }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-400">Reported Failure:</span>
          <span class="font-semibold text-rose-300">{{ incident.reason_name || incident.active_reason_name }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-400">Total Duration:</span>
          <span class="font-mono font-bold text-amber-400">
            {{ formatElapsed(incident.duration_seconds || incident.active_downtime_duration_seconds || 0) }}
          </span>
        </div>
        <div v-if="incident.operator_notes" class="pt-2 border-t border-gray-800/80 text-gray-300 text-[11px]">
          <span class="text-gray-500">Initial Note:</span> {{ incident.operator_notes }}
        </div>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1">
            Corrective Action Taken & Resolution Notes *
          </label>
          <textarea
            v-model="resolutionNotes"
            required
            rows="3"
            placeholder="e.g., Cleared tape jam, cleaned nozzle tip with solvent, inspected feed pitch calibration, tested 5 dry runs successfully."
            class="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
          ></textarea>
        </div>

        <!-- Submit Buttons -->
        <div class="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
          >
            {{ isSubmitting ? 'Resolving...' : 'Confirm & Resume Production' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle2, X } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  incident: any | null
}>()

const emit = defineEmits(['close', 'submit'])

const resolutionNotes = ref('')
const isSubmitting = ref(false)

const formatElapsed = (sec: number) => {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

const handleSubmit = async () => {
  if (!props.incident) return
  isSubmitting.value = true
  try {
    const eventId = props.incident.id || props.incident.active_downtime_id
    emit('submit', {
      id: eventId,
      resolution_notes: resolutionNotes.value
    })
    resolutionNotes.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>
