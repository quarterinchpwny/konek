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
.process-manager {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8e8;
}

.background-layer {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at top, rgba(16, 24, 32, 0.9) 0%, rgba(8, 12, 16, 0.95) 100%),
    linear-gradient(135deg, #0a0e12 0%, #121820 50%, #0f1419 100%);
  z-index: 0;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

.empty-state {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-card {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 35, 42, 0.5);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.empty-icon .icon {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.2);
}

.empty-text {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.loader {
  width: 48px;
  height: 48px;
  margin: 0 auto 1.5rem;
  border: 3px solid rgba(100, 120, 140, 0.2);
  border-top-color: #6b8cae;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.main-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  margin-bottom: 2rem;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.title-icon {
  font-size: 32px;
  color: #7fa1c3;
  margin-top: 4px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.03em;
}

.subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 280px;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: rgba(255, 255, 255, 0.25);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e8e8e8;
  font-size: 0.9375rem;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: rgba(127, 161, 195, 0.4);
  background: rgba(25, 30, 38, 0.7);
}

.total-badge {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  margin-left: auto;
}

.badge-icon {
  font-size: 20px;
  color: #7fa1c3;
}

.badge-text {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.6);
}

.badge-text strong {
  color: #ffffff;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  background: rgba(20, 25, 32, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.process-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.process-table th {
  position: sticky;
  top: 0;
  background: rgba(30, 35, 42, 0.9);
  backdrop-filter: blur(8px);
  padding: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 5;
}

.process-table th.sortable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.process-table th.sortable:hover {
  color: #ffffff;
}

.process-table th.active {
  color: #7fa1c3;
}

.process-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}

.process-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.pid-cell {
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.5);
}

.user-cell {
  color: rgba(255, 255, 255, 0.8);
}

.mem-info-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rss-value {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'JetBrains Mono', monospace;
  padding-left: 52px; /* Align with the start of the bar after the percent value */
}

.percent-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 120px;
}

.percent-value {
  width: 45px;
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
}

.percent-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.percent-fill {
  height: 100%;
  border-radius: 3px;
}

.percent-fill.cpu {
  background: linear-gradient(to right, #5f8aa6, #7fa1c3);
}

.percent-fill.mem {
  background: linear-gradient(to right, #6ba87d, #8bc4a0);
}

.command-cell {
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
}

.actions-cell {
  text-align: right;
}

.kill-btn {
  padding: 0.5rem;
  background: rgba(214, 93, 93, 0.1);
  color: #d68a8a;
  border: 1px solid rgba(214, 93, 93, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.kill-btn:hover {
  background: rgba(214, 93, 93, 0.2);
  color: #ff9e9e;
  border-color: rgba(214, 93, 93, 0.4);
  transform: scale(1.05);
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #1a1f26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 450px;
  padding: 2rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.modal-icon.warning {
  font-size: 32px;
  color: #d68a8a;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.modal-body {
  margin-bottom: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.modal-body strong {
  color: #ffffff;
}

.signal-selector {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.signal-selector select {
  background: rgba(30, 35, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 0.5rem;
  border-radius: 8px;
  outline: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.05);
}

.modal-btn.confirm {
  background: #d68a8a;
  border: none;
  color: #ffffff;
}

.modal-btn.confirm:hover {
  background: #e69a9a;
}

/* Custom Scrollbar */
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