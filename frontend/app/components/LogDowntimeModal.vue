<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl text-left">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-800">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Log Downtime Incident</h3>
            <p class="text-xs text-gray-400">Record machine stoppage & set line to downtime</p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <!-- Production Line -->
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1">Affected Production Line *</label>
          <select 
            v-model="selectedLineId" 
            required 
            class="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option disabled value="">Select line...</option>
            <option v-for="l in lines" :key="l.id" :value="l.id">
              [{{ l.code }}] {{ l.name }} (Current: {{ l.current_status }})
            </option>
          </select>
        </div>

        <!-- Downtime Reason Category / Reason -->
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1">Failure Mode / Reason *</label>
          <select 
            v-model="selectedReasonId" 
            required 
            class="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option disabled value="">Select reason code...</option>
            <optgroup v-for="cat in categories" :key="cat.id" :label="cat.name">
              <option 
                v-for="r in getReasonsForCategory(cat.id)" 
                :key="r.id" 
                :value="r.id"
              >
                {{ r.name }} ({{ r.code }})
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Operator Notes -->
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1">Operator Description & Observations</label>
          <textarea
            v-model="notes"
            rows="3"
            placeholder="Describe what occurred, error alarms on HMI screen, affected components, or visual symptoms..."
            class="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
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
            class="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition"
          >
            {{ isSubmitting ? 'Logging...' : 'Log & Stop Line' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import type { ProductionLine } from '../composables/useFactoryApi'

const props = defineProps<{
  isOpen: boolean
  lines: ProductionLine[]
  categories: any[]
  reasons: any[]
}>()

const emit = defineEmits(['close', 'submit'])

const selectedLineId = ref<number | ''>('')
const selectedReasonId = ref<number | ''>('')
const notes = ref('')
const isSubmitting = ref(false)

const getReasonsForCategory = (catId: number) => {
  return props.reasons.filter(r => r.category_id === catId)
}

const handleSubmit = async () => {
  if (!selectedLineId.value || !selectedReasonId.value) return
  isSubmitting.value = true
  try {
    emit('submit', {
      line_id: Number(selectedLineId.value),
      reason_id: Number(selectedReasonId.value),
      operator_notes: notes.value
    })
    // Reset
    selectedLineId.value = ''
    selectedReasonId.value = ''
    notes.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>
