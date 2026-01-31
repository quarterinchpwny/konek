<template>
  <div class="home-page">
    <!-- Background layers -->
    <div class="home-bg"></div>
    <div class="home-noise"></div>

    <!-- Main content -->
    <div class="home-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <span class="header-label">System Overview</span>
          <h2 class="header-title">Active Infrastructure</h2>
        </div>
        <button @click="isModalOpen = true" class="add-host-btn" title="Add new host">
          <Plus :size="20" stroke-width="3" />
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="hostStore.hosts.length === 0" class="empty-state">
        <div class="empty-card">
          <div class="empty-icon">
            <Server :size="48" stroke-width="1.5" />
          </div>
          <p class="empty-title">No Infrastructure Found</p>
          <p class="empty-subtitle">Deploy your first node to start monitoring metrics.</p>
          <button @click="isModalOpen = true" class="empty-btn">
            <Plus :size="18" />
            Add Your First Host
          </button>
        </div>
      </div>

      <!-- Hosts grid -->
      <div v-else class="hosts-grid">
        <div
          v-for="host in hostStore.hosts"
          :key="host.id"
          @click="setActiveHost(host)"
          :class="['host-card', { 'host-card-active': activeHostId === host.id }]"
        >
          <!-- Card header -->
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon">
                <Server :size="20" stroke-width="2.5" />
              </div>
              <div class="card-title-block">
                <p class="card-title">{{ host.alias }}</p>
                <p class="card-hostname">
                  {{ host.hostname }}
                  <span v-if="host.macAddress" class="card-mac">(MAC: {{ host.macAddress }})</span>
                </p>
              </div>
            </div>

            <div class="card-actions">
              <button
                v-if="host.macAddress"
                @click.stop="wakeHost(host.id!)"
                class="action-btn wake"
                title="Wake On LAN"
              >
                <Zap :size="16" />
              </button>
              <button
                @click.stop="editHost(host)"
                class="action-btn edit"
                title="Edit Host"
              >
                <Pencil :size="16" />
              </button>
              <button
                @click.stop="deleteHost(host.id!)"
                class="action-btn delete"
                title="Delete Host"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <!-- Stats with history -->
          <div class="stats-section">
            <!-- CPU -->
            <div class="stat-item">
              <div class="stat-header">
                <span class="stat-label">CPU</span>
                <span class="stat-value">{{ host.stats?.cpu?.usagePercent?.toFixed(0) || 0 }}%</span>
              </div>
              <div class="stat-history">
                <div
                  v-for="(value, index) in getHistory(host.id!, 'cpu')"
                  :key="`cpu-${host.id}-${index}`"
                  class="history-bar cpu-bar"
                  :class="{ 'history-bar-latest': index === getHistory(host.id!, 'cpu').length - 1 }"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </div>

            <!-- Memory -->
            <div class="stat-item">
              <div class="stat-header">
                <span class="stat-label">MEM</span>
                <span class="stat-value">{{ host.stats?.memory?.percent?.toFixed(0) || 0 }}%</span>
              </div>
              <div class="stat-history">
                <div
                  v-for="(value, index) in getHistory(host.id!, 'memory')"
                  :key="`mem-${host.id}-${index}`"
                  class="history-bar mem-bar"
                  :class="{ 'history-bar-latest': index === getHistory(host.id!, 'memory').length - 1 }"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </div>

          
          </div>

          <!-- Card footer -->
          <div class="card-footer">
            <div class="status-indicator">
              <div class="status-dot" :class="getStatusColorClass(host.status).dot"></div>
              <span class="status-text" :class="getStatusColorClass(host.status).text">
                {{ host.status || "unknown" }}
              </span>
            </div>
            <div class="online-indicator">
              <Zap :size="12" />
              <span>{{ host.online ? "Online" : "Offline" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Transition name="modal-fade">
      <div v-if="isModalOpen" class="modal-overlay" @click.self="cancelEdit">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">{{ editingHost ? "Edit Host" : "Add New Host" }}</h2>
              <p class="modal-subtitle">
                {{ editingHost ? "Update the host details." : "Configure a new remote endpoint." }}
              </p>
            </div>
            <button @click="cancelEdit" class="modal-close">
              <X :size="24" />
            </button>
          </div>

          <form @submit.prevent="saveHost" class="modal-form">
            <div class="form-row">
              <label for="ssh-toggle" class="form-label">Enable SSH</label>
              <label class="toggle-switch">
                <input type="checkbox" id="ssh-toggle" v-model="form.sshEnabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Friendly Name</label>
              <input
                v-model="form.alias"
                type="text"
                required
                placeholder="e.g. Raspberry Pi Cluster"
                class="form-input"
              />
            </div>

            <div class="form-grid">
              <div :class="{ 'form-group-full': !form.sshEnabled, 'form-group-2': form.sshEnabled }">
                <label class="form-label">IP / Host</label>
                <input
                  v-model="form.hostname"
                  type="text"
                  required
                  placeholder="192.168.1.1"
                  class="form-input form-input-mono"
                />
              </div>

              <div v-if="form.sshEnabled" class="form-group-1">
                <label class="form-label">Port</label>
                <input
                  v-model="form.port"
                  type="text"
                  :required="form.sshEnabled"
                  placeholder="22"
                  class="form-input form-input-mono"
                />
              </div>
            </div>

            <div v-if="form.sshEnabled" class="form-group">
              <label class="form-label">Username</label>
              <input
                v-model="form.username"
                type="text"
                :required="form.sshEnabled"
                placeholder="root"
                class="form-input form-input-mono"
              />
            </div>

            <div v-if="form.sshEnabled" class="form-group">
              <label class="form-label">Password</label>
              <input
                v-model="form.password"
                type="password"
                :placeholder="editingHost ? '(leave blank to keep unchanged)' : ''"
                class="form-input form-input-mono"
              />
            </div>

            <div class="form-group">
              <label class="form-label">MAC Address (optional)</label>
              <input
                v-model="form.macAddress"
                type="text"
                placeholder="XX:XX:XX:XX:XX:XX"
                class="form-input form-input-mono"
              />
            </div>

            <div class="form-actions">
              <button
                v-if="editingHost"
                type="button"
                @click="cancelEdit"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <Plus v-if="!editingHost" :size="18" />
                {{ editingHost ? "Update Connection" : "Save Connection" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import { Plus, Server, Trash2, X, Zap, Pencil } from "lucide-vue-next";
import { useRouter } from "vue-router";

const hostStore = useHostStore();
const router = useRouter();

const defaultForm: Host = {
  alias: "",
  hostname: "",
  port: 22,
  username: "",
  password: "",
  macAddress: "",
  sshEnabled: true,
};

const form = reactive<Host>({ ...defaultForm });
const activeHostId = ref<number | null>(null);
const editingHost = ref<Host | null>(null);
const isModalOpen = ref(false);

// History tracking
const HISTORY_SIZE = 20;
const statsHistory = ref<Record<number, {
  cpu: number[];
  memory: number[];
}>>({});

let pollingInterval: number | undefined;

// Initialize history for a host
const initializeHistory = (hostId: number) => {
  if (!statsHistory.value[hostId]) {
    statsHistory.value[hostId] = {
      cpu: [],
      memory: []
    };
  }
};

// Update history with new stats
const updateHistory = (hostId: number, stats: any) => {
  initializeHistory(hostId);
  
  const history = statsHistory.value[hostId];
  
  // CPU
  const cpuPercent = Math.min(100, Math.max(0, stats?.cpu?.usagePercent || 0));
  history.cpu.push(cpuPercent);
  if (history.cpu.length > HISTORY_SIZE) history.cpu.shift();
  
  // Memory
  const memPercent = Math.min(100, Math.max(0, stats?.memory?.percent || 0));
  history.memory.push(memPercent);
  if (history.memory.length > HISTORY_SIZE) history.memory.shift();
};

// Get history for a specific metric
const getHistory = (hostId: number, metric: 'cpu' | 'memory'): number[] => {
  if (!statsHistory.value[hostId]) {
    return [];
  }
  return statsHistory.value[hostId][metric] || [];
};

onMounted(async () => {
  await hostStore.fetchHosts();
  await hostStore.fetchBulkHostStatus();
  
  // Initialize history for all hosts
  hostStore.hosts.forEach(host => {
    if (host.id) {
      initializeHistory(host.id);
      updateHistory(host.id, host.stats);
    }
  });

  pollingInterval = window.setInterval(async () => {
    await hostStore.fetchBulkHostStatus();
    
    // Update history for all hosts
    hostStore.hosts.forEach(host => {
      if (host.id && host.stats) {
        updateHistory(host.id, host.stats);
      }
    });
  }, 5000);
});

onUnmounted(() => {
  clearInterval(pollingInterval);
});

function getStatusColorClass(status: Host["status"]): { dot: string; text: string } {
  switch (status) {
    case "online":
      return { dot: "status-dot-online", text: "status-text-online" };
    case "offline":
      return { dot: "status-dot-offline", text: "status-text-offline" };
    case "error":
      return { dot: "status-dot-error", text: "status-text-error" };
    case "checking...":
      return { dot: "status-dot-checking", text: "status-text-checking" };
    default:
      return { dot: "status-dot-unknown", text: "status-text-unknown" };
  }
}

function resetForm() {
  Object.assign(form, defaultForm);
  editingHost.value = null;
}

function cancelEdit() {
  resetForm();
  isModalOpen.value = false;
}

async function saveHost() {
  try {
    if (editingHost.value) {
      await hostStore.updateHost(editingHost.value.id!, { ...form });
    } else {
      await hostStore.addHost({ ...form });
    }
    resetForm();
    isModalOpen.value = false;
    await hostStore.fetchHosts();
  } catch (e) {
    console.error(e);
  }
}

function editHost(host: Host) {
  editingHost.value = host;
  form.alias = host.alias;
  form.hostname = host.hostname;
  form.port = host.port;
  form.username = host.username;
  form.macAddress = host.macAddress;
  form.sshEnabled = host.sshEnabled;
  form.password = "";
  isModalOpen.value = true;
}

function setActiveHost(host: Host) {
  if (!host.sshEnabled) return;
  activeHostId.value = host?.id ?? null;
  hostStore.setSelectedHost(host);
  router.push({ name: "dashboard" });
}

async function wakeHost(id: number) {
  try {
    await hostStore.sendWol(id);
    alert("WOL packet sent!");
  } catch (e) {
    alert(`Failed to send WOL packet: ${hostStore.error}`);
  }
}

async function deleteHost(id: number) {
  if (confirm("Delete this connection?")) {
    try {
      await hostStore.deleteHost(id);
      if (activeHostId.value === id) activeHostId.value = null;
      // Clean up history
      if (statsHistory.value[id]) {
        delete statsHistory.value[id];
      }
    } catch (e) {
      console.error(e);
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.home-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Background */
.home-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at top, rgba(16, 24, 32, 0.9) 0%, rgba(8, 12, 16, 0.95) 100%),
    linear-gradient(135deg, #0a0e12 0%, #121820 50%, #0f1419 100%);
  z-index: 0;
}

.home-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Content */
.home-content {
  position: relative;
  z-index: 2;
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem;
}

.home-content::-webkit-scrollbar {
  width: 8px;
}

.home-content::-webkit-scrollbar-track {
  background: transparent;
}

.home-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.home-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.375rem;
}

.header-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.03em;
}

.add-host-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #7fa1c3;
  border: none;
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(127, 161, 195, 0.3);
}

.add-host-btn:hover {
  background: #6b8cae;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(127, 161, 195, 0.4);
}

.add-host-btn:active {
  transform: translateY(0);
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.empty-card {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(20, 25, 32, 0.6);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  max-width: 400px;
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
  color: rgba(255, 255, 255, 0.3);
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 2rem 0;
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: #7fa1c3;
  border: none;
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-btn:hover {
  background: #6b8cae;
  transform: translateY(-1px);
}

/* Hosts grid */
.hosts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

/* Host card */
.host-card {
  position: relative;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.host-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.host-card-active {
  background: rgba(107, 140, 174, 0.12);
  border-color: rgba(107, 140, 174, 0.3);
  box-shadow: 0 0 0 2px rgba(107, 140, 174, 0.1);
}

/* Card header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.card-header-left {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  flex: 1;
  min-width: 0;
}

.card-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 35, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.host-card-active .card-icon {
  background: rgba(107, 140, 174, 0.2);
  border-color: rgba(107, 140, 174, 0.3);
  color: #7fa1c3;
}

.card-title-block {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.375rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.02em;
}

.card-hostname {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'JetBrains Mono', monospace;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-weight: 600;
}

.card-mac {
  color: rgba(255, 255, 255, 0.3);
  margin-left: 0.5rem;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.host-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.wake:hover {
  background: rgba(168, 85, 247, 0.15);
  color: #b19dd4;
}

.action-btn.edit:hover {
  background: rgba(234, 179, 8, 0.15);
  color: #e8c368;
}

.action-btn.delete:hover {
  background: rgba(214, 93, 93, 0.15);
  color: #d68a8a;
}

/* Stats section */
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(10, 14, 18, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.stat-item-simple {
  gap: 0.5rem;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', monospace;
}

.stat-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'JetBrains Mono', monospace;
}

.stat-history {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 28px;
  gap: 2px;
  background: rgba(10, 14, 18, 0.4);
  border-radius: 6px;
  padding: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.02);
}

.history-bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.5;
}

.history-bar-latest {
  opacity: 1 !important;
}

.cpu-bar {
  background: #7fa1c3;
}

.mem-bar {
  background: #b19dd4;
}

/* Simple bar for disk */
.stat-bar-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.disk-fill {
  background: #e8c368;
}

/* Card footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot-online {
  background: #8bc4a0;
  box-shadow: 0 0 8px rgba(139, 196, 160, 0.6);
}

.status-dot-offline {
  background: #d68a8a;
}

.status-dot-error {
  background: #e8c368;
}

.status-dot-checking {
  background: rgba(255, 255, 255, 0.4);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.status-dot-unknown {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-text-online { color: #8bc4a0; }
.status-text-offline { color: #d68a8a; }
.status-text-error { color: #e8c368; }
.status-text-checking { color: rgba(255, 255, 255, 0.5); }
.status-text-unknown { color: rgba(255, 255, 255, 0.4); }

.online-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

/* Modal - reusing styles from Sidebar */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: #16161a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.375rem 0;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.modal-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

/* Form */
.modal-form {
  padding: 2rem;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-group-2 {
  grid-column: span 1;
}

.form-group-1 {
  grid-column: span 1;
}

.form-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.form-input:focus {
  outline: none;
  background: rgba(25, 30, 38, 0.8);
  border-color: rgba(127, 161, 195, 0.4);
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
}

.form-input-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.3s ease;
}

input:checked + .toggle-slider {
  background: #7fa1c3;
}

input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #7fa1c3;
  color: #ffffff;
}

.btn-primary:hover {
  background: #6b8cae;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(127, 161, 195, 0.3);
}

.btn-secondary {
  background: rgba(140, 140, 150, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.btn-secondary:hover {
  background: rgba(140, 140, 150, 0.25);
}

/* Modal animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .home-content {
    padding: 1.5rem;
  }

  .hosts-grid {
    grid-template-columns: 1fr;
  }
}
</style>