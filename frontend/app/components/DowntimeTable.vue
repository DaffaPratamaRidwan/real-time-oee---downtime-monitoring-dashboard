<template>
  <div class="space-y-4">
    <!-- 1. Active Downtimes Section (Only if there are any active) -->
    <div v-if="activeDowntimes.length > 0" class="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-rose-400"></span>
          <h3 class="text-xs font-semibold text-rose-200 uppercase tracking-wider font-mono">
            Insiden Downtime Sedang Aktif ({{ activeDowntimes.length }})
          </h3>
        </div>
        <span class="text-[11px] text-zinc-500 font-mono">
          Sinkronisasi real-time
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-rose-500/20 text-[11px] font-mono text-zinc-400">
              <th class="py-2 px-2.5">Lini</th>
              <th class="py-2 px-2.5">Penyebab</th>
              <th class="py-2 px-2.5">Durasi</th>
              <th class="py-2 px-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/60 font-mono">
            <tr v-for="item in activeDowntimes" :key="item.id" class="hover:bg-rose-950/20 transition">
              <td class="py-2.5 px-2.5">
                <span class="font-medium text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                  {{ item.line_code }}
                </span>
                <span class="text-zinc-300 ml-2 font-sans font-medium">{{ item.line_name }}</span>
              </td>
              <td class="py-2.5 px-2.5 font-sans">
                <div class="text-zinc-200 font-medium">{{ item.reason_name }}</div>
                <div class="text-[10px] text-zinc-500">{{ item.category_name }}</div>
              </td>
              <td class="py-2.5 px-2.5 text-rose-400 font-medium">
                {{ formatElapsed(item.duration_seconds) }}
              </td>
              <td class="py-2.5 px-2.5 text-right font-sans">
                <button
                  @click="$emit('resolve', item)"
                  class="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-xs transition"
                >
                  Selesaikan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. Historical Incident Log Section -->
    <div class="rounded-xl border border-zinc-800/60 bg-[#11141d]/50 p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Riwayat Insiden Downtime
          </h3>
          <p class="text-[11px] text-zinc-500 mt-0.5">
            Daftar waktu henti lini produksi beserta penyebab dan catatan perbaikan
          </p>
        </div>

        <!-- Filter Controls -->
        <div class="flex items-center gap-2 text-xs font-mono">
          <select 
            :value="selectedLineFilter" 
            @change="$emit('update-line-filter', ($event.target as HTMLSelectElement).value)"
            class="bg-zinc-800/70 text-zinc-300 rounded-lg px-2.5 py-1.5 border border-zinc-700/60 focus:outline-none"
          >
            <option value="">Semua Lini</option>
            <option v-for="l in lines" :key="l.id" :value="l.id">{{ l.code }}</option>
          </select>

          <button 
            @click="exportCsv"
            class="px-2.5 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1.5"
            title="Download log sebagai CSV"
          >
            <Download class="w-3.5 h-3.5 text-zinc-400" />
            <span class="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      <div v-if="history && history.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-zinc-800/80 text-[11px] font-mono text-zinc-500">
              <th class="py-2 px-2.5">Waktu</th>
              <th class="py-2 px-2.5">Lini</th>
              <th class="py-2 px-2.5">Penyebab Masalah</th>
              <th class="py-2 px-2.5">Durasi</th>
              <th class="py-2 px-2.5">Tindakan Perbaikan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/40 font-mono">
            <tr v-for="h in history" :key="h.id" class="hover:bg-zinc-800/20 transition">
              <td class="py-2.5 px-2.5 text-zinc-400 text-[11px]">
                {{ formatDateTime(h.start_time) }}
              </td>
              <td class="py-2.5 px-2.5">
                <span class="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 text-[10px]">
                  {{ h.line_code }}
                </span>
              </td>
              <td class="py-2.5 px-2.5 font-sans font-medium text-zinc-200">
                {{ h.reason_name }}
              </td>
              <td class="py-2.5 px-2.5 text-amber-400/90 font-medium">
                {{ h.duration_minutes || (Math.round(h.duration_seconds / 60)) }} m
              </td>
              <td class="py-2.5 px-2.5 font-sans text-zinc-400 text-xs max-w-sm truncate" :title="h.resolution_notes">
                {{ h.resolution_notes || h.operator_notes || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center py-8 text-zinc-500 text-xs font-mono">
        Tidak ada data riwayat downtime untuk filter yang dipilih.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import type { ActiveDowntime, ProductionLine } from '../composables/useFactoryApi'

const props = defineProps<{
  activeDowntimes: ActiveDowntime[]
  history: any[]
  lines: ProductionLine[]
  selectedLineFilter: string
}>()

defineEmits(['acknowledge', 'resolve', 'update-line-filter'])

const formatElapsed = (sec: number) => {
  if (sec < 60) return `${sec}d`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m ${s}d`
  const h = Math.floor(m / 60)
  return `${h}j ${m % 60}m`
}

const formatDateTime = (ts: string) => {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const exportCsv = () => {
  if (!props.history || props.history.length === 0) return
  const headers = ['ID', 'Waktu Mulai', 'Lini', 'Penyebab', 'Kategori', 'Durasi (menit)', 'Catatan', 'Resolusi']
  const rows = props.history.map(h => [
    h.id,
    h.start_time,
    h.line_code,
    `"${(h.reason_name || '').replace(/"/g, '""')}"`,
    `"${(h.category_name || '').replace(/"/g, '""')}"`,
    h.duration_minutes || Math.round(h.duration_seconds / 60),
    `"${(h.operator_notes || '').replace(/"/g, '""')}"`,
    `"${(h.resolution_notes || '').replace(/"/g, '""')}"`
  ])

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `downtime_history_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>
