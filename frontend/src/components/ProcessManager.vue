<template>
  <div class="process-manager">
    <!-- Background layers -->
    <div class="background-layer"></div>
    <div class="noise-overlay"></div>
    
    <!-- No host -->
    <div v-if="!hostId" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">
          <Icon icon="mdi:cpu-64-bit" class="icon" />
        </div>
        <p class="empty-text">Select a host to view processes</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading && !processes.length" class="empty-state">
      <div class="empty-card">
        <div class="loader"></div>
        <p class="empty-text">Loading processes...</p>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="main-content">
      <!-- Header -->
      <div class="header">
        <div class="header-title">
          <Icon icon="mdi:cpu-64-bit" class="title-icon" />
          <div>
            <h1 class="title">System Processes</h1>
            <p class="subtitle">Monitor and manage running processes on your host</p>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrapper">
          <Icon icon="mdi:magnify" class="search-icon" />
          <input 
            v-model="search" 
            placeholder="Search by name, PID, or user..."
            class="search-input" 
          />
        </div>
        
        <div class="total-badge">
          <Icon icon="mdi:list-status" class="badge-icon" />
          <span class="badge-text">Total: <strong>{{ filteredProcesses.length }}</strong></span>
        </div>
      </div>

      <!-- Process Table -->
      <div class="table-container">
        <table class="process-table">
          <thead>
            <tr>
              <th @click="toggleSort('pid')" :class="{ 'sortable': true, 'active': sortKey === 'pid' }" class="hidden sm:table-cell">
                PID
                <Icon v-if="sortKey === 'pid'" :icon="sortOrder === 'desc' ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
              </th>
              <th @click="toggleSort('user')" :class="{ 'sortable': true, 'active': sortKey === 'user' }" class="hidden md:table-cell">
                USER
                <Icon v-if="sortKey === 'user'" :icon="sortOrder === 'desc' ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
              </th>
              <th @click="toggleSort('cpu')" :class="{ 'sortable': true, 'active': sortKey === 'cpu' }">
                CPU %
                <Icon v-if="sortKey === 'cpu'" :icon="sortOrder === 'desc' ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
              </th>
              <th @click="toggleSort('mem')" :class="{ 'sortable': true, 'active': sortKey === 'mem' }" class="hidden sm:table-cell">
                MEM
                <Icon v-if="sortKey === 'mem'" :icon="sortOrder === 'desc' ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
              </th>
              <th @click="toggleSort('command')" :class="{ 'sortable': true, 'active': sortKey === 'command' }">
                COMMAND
                <Icon v-if="sortKey === 'command'" :icon="sortOrder === 'desc' ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
              </th>
              <th class="actions-header">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="proc in sortedProcesses" :key="proc.pid">
              <td class="pid-cell hidden sm:table-cell">{{ proc.pid }}</td>
              <td class="user-cell hidden md:table-cell">{{ proc.user }}</td>
              <td class="cpu-cell">
                <div class="percent-bar-wrapper min-w-[60px] sm:min-w-[120px]">
                  <span class="percent-value">{{ proc.cpu.toFixed(1) }}%</span>
                  <div class="percent-bar hidden sm:block">
                    <div class="percent-fill cpu" :style="{ width: Math.min(100, proc.cpu) + '%' }"></div>
                  </div>
                </div>
              </td>
              <td class="mem-cell hidden sm:table-cell">
                <div class="mem-info-wrapper">
                  <div class="percent-bar-wrapper">
                    <span class="percent-value">{{ proc.mem.toFixed(1) }}%</span>
                    <div class="percent-bar">
                      <div class="percent-fill mem" :style="{ width: Math.min(100, proc.mem) + '%' }"></div>
                    </div>
                  </div>
                  <span class="rss-value">{{ formatBytes(proc.rss * 1024) }}</span>
                </div>
              </td>
              <td class="command-cell" :title="proc.command">
                <div class="flex flex-col">
                  <span class="truncate">{{ proc.command }}</span>
                  <span class="sm:hidden text-[10px] text-white/30">PID: {{ proc.pid }} • MEM: {{ proc.mem.toFixed(1) }}%</span>
                </div>
              </td>
              <td class="actions-cell">
                <button @click="confirmKill(proc)" class="kill-btn" title="Kill Process">
                  <Icon icon="mdi:trash-can-outline" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmKill" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <Icon icon="mdi:alert-circle-outline" class="modal-icon warning" />
          <h3 class="modal-title">Kill Process?</h3>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to kill process <strong>{{ selectedProcess?.pid }}</strong> ({{ selectedProcess?.command }})?</p>
          <div class="signal-selector">
            <label>Signal:</label>
            <select v-model="killSignal">
              <option value="SIGTERM">SIGTERM (Graceful)</option>
              <option value="SIGKILL">SIGKILL (Forceful)</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showConfirmKill = false" class="modal-btn cancel">Cancel</button>
          <button @click="killProcess" class="modal-btn confirm">Kill Process</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Icon } from '@iconify/vue';

interface Process {
  pid: string;
  user: string;
  cpu: number;
  mem: number;
  rss: number;
  command: string;
}

const props = defineProps<{ hostId?: number }>();

const processes = ref<Process[]>([]);
const isLoading = ref(false);
const search = ref('');
const sortKey = ref('cpu');
const sortOrder = ref<'asc' | 'desc'>('desc');

const showConfirmKill = ref(false);
const selectedProcess = ref<Process | null>(null);
const killSignal = ref('SIGTERM');

let intervalId: number | null = null;

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const fetchProcesses = async () => {
  if (!props.hostId) return;
  
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/processes`);
    if (!res.ok) return;

    const data = await res.json();
    processes.value = data.processes;
  } catch (e) {
    console.error('Failed to fetch processes:', e);
  } finally {
    isLoading.value = false;
  }
};

const filteredProcesses = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return processes.value;
  return processes.value.filter(p => 
    p.pid.toLowerCase().includes(q) ||
    p.user.toLowerCase().includes(q) ||
    p.command.toLowerCase().includes(q)
  );
});

const sortedProcesses = computed(() => {
  const data = [...filteredProcesses.value];
  const key = sortKey.value as keyof Process;
  const order = sortOrder.value === 'asc' ? 1 : -1;

  return data.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return -1 * order;
    if (valA > valB) return 1 * order;
    return 0;
  });
});

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'desc';
  }
};

const confirmKill = (proc: Process) => {
  selectedProcess.value = proc;
  showConfirmKill.value = true;
};

const killProcess = async () => {
  if (!selectedProcess.value || !props.hostId) return;

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/processes/${selectedProcess.value.pid}?signal=${killSignal.value}`,
      { method: 'DELETE' }
    );

    if (res.ok) {
      showConfirmKill.value = false;
      fetchProcesses();
    } else {
      const err = await res.json();
      alert(`Failed to kill process: ${err.message}`);
    }
  } catch (e) {
    console.error('Error killing process:', e);
  }
};

onMounted(() => {
  if (props.hostId) {
    isLoading.value = true;
    fetchProcesses();
    intervalId = setInterval(fetchProcesses, 5000) as unknown as number;
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(() => props.hostId, (newId) => {
  if (intervalId) clearInterval(intervalId);
  processes.value = [];
  if (newId) {
    isLoading.value = true;
    fetchProcesses();
    intervalId = setInterval(fetchProcesses, 5000) as unknown as number;
  }
});
</script>

<style scoped>
@reference "../assets/css/main.css";

.process-manager {
  @apply relative h-full w-full overflow-hidden text-[#e8e8e8];
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

.background-layer {
  @apply absolute inset-0 z-0;
  background: 
    radial-gradient(ellipse at top, rgba(16, 24, 32, 0.9) 0%, rgba(8, 12, 16, 0.95) 100%),
    linear-gradient(135deg, #0a0e12 0%, #121820 50%, #0f1419 100%);
}

.noise-overlay {
  @apply pointer-events-none absolute inset-0 z-[1];
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

.empty-state {
  @apply relative z-[2] flex h-full items-center justify-center;
}

.empty-card {
  @apply rounded-2xl border border-white/6 bg-[rgba(20,25,32,0.6)] px-8 py-12 text-center;
  backdrop-filter: blur(12px);
}

.empty-icon {
  @apply mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-[rgba(30,35,42,0.5)];
}

.empty-icon .icon {
  @apply text-[40px] text-white/20;
}

.empty-text {
  @apply text-lg text-white/40;
}

.loader {
  @apply mx-auto mb-6 h-12 w-12 rounded-full border-[3px] border-[#64788c33] border-t-[#6b8cae];
  border-top-color: #6b8cae;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.main-content {
  @apply relative z-[2] flex h-full flex-col overflow-hidden px-10 py-8;
}

.header {
  @apply mb-8 shrink-0;
}

.header-title {
  @apply flex items-start gap-4;
}

.title-icon {
  @apply mt-1 text-[32px] text-[#7fa1c3];
}

.title {
  @apply mb-1 text-[2rem] font-bold tracking-[-0.03em] text-white;
}

.subtitle {
  @apply text-[0.9375rem] text-white/45;
}

.toolbar {
  @apply mb-6 flex shrink-0 flex-wrap items-center gap-4;
}

.search-wrapper {
  @apply relative max-w-[480px] min-w-[280px] flex-1;
}

.search-icon {
  @apply pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-white/25;
}

.search-input {
  @apply w-full rounded-xl border border-white/8 bg-[rgba(20,25,32,0.5)] px-4 py-3 pl-12 text-[0.9375rem] text-[#e8e8e8];
  font-family: inherit;
}

.search-input:focus {
  @apply border-[#7fa1c366] bg-[rgba(25,30,38,0.7)] outline-none;
}

.total-badge {
  @apply ml-auto flex items-center gap-2.5 rounded-xl border border-white/8 bg-[rgba(20,25,32,0.5)] px-5 py-3;
}

.badge-icon {
  @apply text-[20px] text-[#7fa1c3];
}

.badge-text {
  @apply text-[0.9375rem] text-white/60;
}

.badge-text strong {
  @apply text-white;
}

.table-container {
  @apply flex-1 overflow-y-auto rounded-xl border border-white/6 bg-[rgba(20,25,32,0.4)];
}

.process-table {
  @apply w-full border-collapse text-left text-sm;
}

.process-table th {
  @apply sticky top-0 z-[5] border-b border-white/6 bg-[rgba(30,35,42,0.9)] p-4 text-xs font-semibold uppercase tracking-[0.05em] text-white/50;
  backdrop-filter: blur(8px);
}

.process-table th.sortable {
  @apply cursor-pointer transition-colors;
}

.process-table th.sortable:hover {
  @apply text-white;
}

.process-table th.active {
  @apply text-[#7fa1c3];
}

.process-table td {
  @apply border-b border-white/4 px-4 py-3.5 align-middle;
}

.process-table tr:hover td {
  @apply bg-white/[0.02];
}

.pid-cell {
  @apply text-white/50;
  font-family: 'JetBrains Mono', monospace;
}

.user-cell {
  @apply text-white/80;
}

.mem-info-wrapper {
  @apply flex flex-col gap-1;
}

.rss-value {
  @apply pl-[52px] text-xs text-white/40;
  font-family: 'JetBrains Mono', monospace;
}

.percent-bar-wrapper {
  @apply flex min-w-[120px] items-center gap-3;
}

.percent-value {
  @apply w-[45px] text-right;
  font-family: 'JetBrains Mono', monospace;
}

.percent-bar {
  @apply h-1.5 flex-1 overflow-hidden rounded bg-white/5;
}

.percent-fill {
  @apply h-full rounded;
}

.percent-fill.cpu {
  background: linear-gradient(to right, #5f8aa6, #7fa1c3);
}

.percent-fill.mem {
  background: linear-gradient(to right, #6ba87d, #8bc4a0);
}

.command-cell {
  @apply max-w-[400px] truncate text-[0.8125rem] text-white/70;
  font-family: 'JetBrains Mono', monospace;
}

.actions-cell {
  @apply text-right;
}

.kill-btn {
  @apply inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#d65d5d33] bg-[#d65d5d1a] p-2 text-[#d68a8a] transition-all;
  transition: all 0.2s ease;
}

.kill-btn:hover {
  @apply border-[#d65d5d66] bg-[#d65d5d33] text-[#ff9e9e];
  transform: scale(1.05);
}

.modal-overlay {
  @apply fixed inset-0 z-[100] flex items-center justify-center bg-black/70;
  backdrop-filter: blur(4px);
}

.modal-card {
  @apply w-full max-w-[450px] rounded-2xl border border-white/10 bg-[#1a1f26] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)];
}

.modal-header {
  @apply mb-6 flex items-center gap-4;
}

.modal-icon.warning {
  @apply text-[32px] text-[#d68a8a];
}

.modal-title {
  @apply text-xl font-bold;
}

.modal-body {
  @apply mb-8 text-white/70;
}

.modal-body strong {
  @apply text-white;
}

.signal-selector {
  @apply mt-6 flex items-center gap-4;
}

.signal-selector select {
  @apply rounded-lg border border-white/10 bg-[rgba(30,35,42,0.6)] p-2 text-white outline-none;
}

.modal-footer {
  @apply flex justify-end gap-4;
}

.modal-btn {
  @apply cursor-pointer rounded-[10px] px-6 py-3 font-semibold transition-all;
  transition: all 0.2s ease;
}

.modal-btn.cancel {
  @apply border border-white/10 bg-transparent text-white/60;
}

.modal-btn.cancel:hover {
  @apply bg-white/5;
}

.modal-btn.confirm {
  @apply border-0 bg-[#d68a8a] text-white;
}

.modal-btn.confirm:hover {
  @apply bg-[#e69a9a];
}

.table-container::-webkit-scrollbar {
  width: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
