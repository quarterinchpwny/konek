<template>
  <div class="docker-manager">
    <!-- Background layers -->
    <div class="background-layer"></div>
    <div class="noise-overlay"></div>
    
    <!-- No host -->
    <div v-if="!hostId" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">
          <Icon icon="mdi:docker" class="icon" />
        </div>
        <p class="empty-text">Select a host to view Docker containers</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="empty-state">
      <div class="empty-card">
        <div class="loader"></div>
        <p class="empty-text">Loading Docker info...</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!dockerInfo?.containers?.length" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">
          <Icon icon="mdi:docker" class="icon" />
        </div>
        <p class="empty-text">No Docker containers found</p>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="main-content">
      <!-- Header -->
      <div class="header">
        <div class="header-title">
          <Icon icon="mdi:docker" class="title-icon" />
          <div>
            <h1 class="title">Docker Containers</h1>
            <p class="subtitle">Manage and monitor your containerized applications</p>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrapper">
          <Icon icon="mdi:magnify" class="search-icon" />
          <input 
            v-model="search" 
            placeholder="Search containers, images, or projects..."
            class="search-input" 
          />
        </div>
        
        <label class="filter-toggle">
          <input type="checkbox" v-model="showOnlyRunning" />
          <span class="filter-label">Running only</span>
          <span v-if="showOnlyRunning" class="filter-badge">{{ runningCount }}</span>
        </label>

        <div class="total-badge">
          <Icon icon="mdi:server" class="badge-icon" />
          <span class="badge-text">Total: <strong>{{ dockerInfo?.containers?.length || 0 }}</strong></span>
        </div>
      </div>

      <!-- Container groups -->
      <div class="groups-container">
        <div v-for="(containers, group) in groupedContainers" :key="group" class="group">
          <!-- Group header -->
          <div class="group-header">
            <div class="group-header-left">
              <button 
                @click="collapsed[group] = !collapsed[group]"
                class="collapse-btn"
              >
                <Icon 
                  :icon="collapsed[group] ? 'mdi:chevron-right' : 'mdi:chevron-down'" 
                  class="collapse-icon" 
                />
              </button>
              <h3 class="group-title">{{ group }}</h3>
              <span class="group-count">{{ containers.length }}</span>
            </div>

            <div v-if="collapsed[group] && stackTotals[group]" class="group-stats">
              <div class="stat-item">
                <Icon icon="mdi:cpu-64-bit" class="stat-icon cpu" />
                <span class="stat-label">CPU:</span>
                <span class="stat-value">{{ stackTotals[group].cpu.toFixed(1) }}%</span>
              </div>
              <div class="stat-item">
                <Icon icon="mdi:memory" class="stat-icon mem" />
                <span class="stat-label">RAM:</span>
                <span class="stat-value">
                  {{ formatBytes(stackTotals[group].memUsed) }} / {{ formatBytes(stackTotals[group].memLimit) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Container cards -->
          <transition-group 
            name="card"
            tag="div"
            v-show="!collapsed[group]" 
            class="cards-grid"
          >
            <div 
              v-for="container in containers" 
              :key="container.id"
              class="container-card"
            >
              <!-- Card header -->
              <div class="card-header">
                <div class="card-header-left">
                  <div class="card-icon-wrapper">
                    <Icon :icon="getIconCached(container)" class="card-icon" />
                  </div>
                  <div class="card-title-block">
                    <h4 class="card-title">{{ container.name }}</h4>
                    <p class="card-image">{{ container.image }}</p>
                  </div>
                </div>

                <span class="status-badge" :class="getStatusClass(container.status)">
                  {{ container.status.split(' ')[0] }}
                </span>
              </div>

              <!-- Compose info -->
              <div v-if="container.compose" class="compose-info">
                <Icon icon="mdi:docker" class="compose-icon" />
                <span class="compose-project">{{ container.compose.project }}</span>
                <span class="compose-separator">·</span>
                <span class="compose-service">{{ container.compose.service }}</span>
              </div>

              <!-- Metadata -->
              <div class="metadata">
                <div class="meta-item">
                  <Icon icon="mdi:heart-pulse" class="meta-icon health" />
                  <span class="meta-text">{{ container.health }}</span>
                </div>
                <div class="meta-item">
                  <Icon icon="mdi:restart" class="meta-icon restart" />
                  <span class="meta-text">{{ container.restartPolicy }}</span>
                </div>
              </div>

              <!-- CPU Graph -->
              <div v-if="container.stats" class="metric-block">
                <div class="metric-header">
                  <div class="metric-label">
                    <Icon icon="mdi:cpu-64-bit" class="metric-icon cpu" />
                    <span>CPU Usage</span>
                  </div>
                  <span class="metric-value cpu">{{ container.stats.cpu.toFixed(1) }}%</span>
                </div>
                <div class="chart">
                  <div 
                    v-for="(val, idx) in getCpuHistory(container)" 
                    :key="idx"
                    class="bar cpu-bar"
                    :style="{ 
                      height: Math.max(2, val) + '%', 
                      opacity: 0.3 + (idx / HISTORY_LENGTH) * 0.7 
                    }" 
                  />
                </div>
              </div>

              <!-- Memory Graph -->
              <div v-if="container.stats" class="metric-block">
                <div class="metric-header">
                  <div class="metric-label">
                    <Icon icon="mdi:memory" class="metric-icon mem" />
                    <span>Memory</span>
                  </div>
                  <span class="metric-value mem">
                    {{ formatBytes(container.stats.memUsed) }} / {{ formatBytes(container.stats.memLimit) }}
                  </span>
                </div>
                <div class="chart">
                  <div 
                    v-for="(val, idx) in getMemHistory(container)" 
                    :key="idx"
                    class="bar mem-bar"
                    :style="{ 
                      height: Math.max(2, val) + '%', 
                      opacity: 0.3 + (idx / HISTORY_LENGTH) * 0.7 
                    }" 
                  />
                </div>
              </div>

              <!-- Controls -->
              <div class="controls">
                <div class="control-group">
                  <button 
                    @click="handleAction(container.id, 'start')" 
                    :disabled="container.status.startsWith('Up')"
                    :title="container.status.startsWith('Up') ? 'Already running' : 'Start container'"
                    class="control-btn start"
                  >
                    <Icon icon="mdi:play" class="control-icon" />
                  </button>

                  <button 
                    @click="handleAction(container.id, 'stop')" 
                    :disabled="!container.status.startsWith('Up')"
                    :title="!container.status.startsWith('Up') ? 'Already stopped' : 'Stop container'"
                    class="control-btn stop"
                  >
                    <Icon icon="mdi:stop" class="control-icon" />
                  </button>

                  <button 
                    @click="handleAction(container.id, 'restart')"
                    title="Restart container"
                    class="control-btn restart"
                  >
                    <Icon icon="mdi:restart" class="control-icon" />
                  </button>
                </div>

                <button 
                  @click="openLogs(container.id)" 
                  title="View logs"
                  class="control-btn logs"
                >
                  <Icon icon="mdi:console" class="control-icon" />
                </button>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <DockerLogsViewer :show="showLogsModal" :container-id="selectedContainerId" @close="showLogsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSshStore } from '../stores/SSHStore';
import { useDockerStore } from '../stores/dockerStore';
import DockerLogsViewer from './DockerLogsViewer.vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{ hostId?: number }>();

const sshStore = useSshStore();
const dockerStore = useDockerStore();

const stats = ref<any>(null);
const isLoading = ref(false);

const showLogsModal = ref(false);
const selectedContainerId = ref<string | null>(null);

const search = ref('');
const showOnlyRunning = ref(false);
const collapsed = ref<Record<string, boolean>>({});

let intervalId: number | null = null;
const iconCache = ref<Record<string, string>>({});
const historyCache = ref<Record<string, { cpu: number[], mem: number[] }>>({});
const HISTORY_LENGTH = 20;

const dockerInfo = computed(() => stats.value?.docker);

const runningCount = computed(() => {
  return (dockerInfo.value?.containers || []).filter((c: any) => c.status.startsWith('Up')).length;
});

const fetchStats = async () => {
  if (!props.hostId) return;
  
  if (!stats.value) {
    isLoading.value = true;
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`);
    if (!res.ok) return;

    const newStats = await res.json();

    if (stats.value?.docker?.containers) {
      const oldMap = new Map(stats.value.docker.containers.map((c: any) => [c.id, c]));
      const newMap = new Map(newStats.docker.containers.map((c: any) => [c.id, c]));
      
      oldMap.forEach((oldContainer, id) => {
        const newContainer = newMap.get(id);
        if (newContainer) {
          Object.keys(newContainer).forEach(key => {
            oldContainer[key] = newContainer[key];
          });
          
          if (newContainer.stats) {
            if (!historyCache.value[id]) {
              historyCache.value[id] = { cpu: [], mem: [] };
            }
            const history = historyCache.value[id];
            history.cpu.push(newContainer.stats.cpu);
            history.mem.push(memPercent(newContainer));
            
            if (history.cpu.length > HISTORY_LENGTH) history.cpu.shift();
            if (history.mem.length > HISTORY_LENGTH) history.mem.shift();
          }
        }
      });
      
      newMap.forEach((newContainer, id) => {
        if (!oldMap.has(id)) {
          stats.value.docker.containers.push(newContainer);
          if (newContainer.stats) {
            historyCache.value[id] = {
              cpu: [newContainer.stats.cpu],
              mem: [memPercent(newContainer)]
            };
          }
        }
      });
      
      stats.value.docker.containers = stats.value.docker.containers.filter(
        (c: any) => newMap.has(c.id)
      );
      
      Object.keys(historyCache.value).forEach(id => {
        if (!newMap.has(id)) {
          delete historyCache.value[id];
        }
      });
    } else {
      stats.value = newStats;
      if (newStats.docker?.containers) {
        newStats.docker.containers.forEach((c: any) => {
          if (c.stats) {
            historyCache.value[c.id] = {
              cpu: [c.stats.cpu],
              mem: [memPercent(c)]
            };
          }
        });
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const groupedContainers = computed(() => {
  const q = search.value.toLowerCase();
  const filtered = (dockerInfo.value?.containers || []).filter((c: any) => {
    if (showOnlyRunning.value && !c.status.startsWith('Up')) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) ||
           c.image.toLowerCase().includes(q) ||
           c.group?.toLowerCase().includes(q) ||
           c.compose?.project?.toLowerCase().includes(q) ||
           c.compose?.service?.toLowerCase().includes(q);
  });

  const groups: Record<string, any[]> = {};
  filtered.forEach((c: any) => {
    const key = c.group || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return groups;
});

const stackTotals = computed(() => {
  const totals: Record<string, any> = {};
  (dockerInfo.value?.containers || []).forEach((c: any) => {
    const g = c.group;
    if (!g || !c.stats) return;
    if (!totals[g]) totals[g] = { cpu: 0, memUsed: 0, memLimit: 0 };
    totals[g].cpu += c.stats.cpu;
    totals[g].memUsed += c.stats.memUsed;
    totals[g].memLimit += c.stats.memLimit;
  });
  return totals;
});

const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
  await dockerStore.performAction(id, action);
  fetchStats();
};

const openLogs = (id: string) => {
  selectedContainerId.value = id;
  showLogsModal.value = true;
};

const getStatusClass = (status: string) => {
  if (status.startsWith('Up')) return 'status-up';
  if (status.startsWith('Exited')) return 'status-exited';
  return 'status-other';
};

const formatBytes = (b: number) => {
  if (!b) return '0B';
  const u = ['B','KB','MB','GB','TB'];
  let i = 0;
  while (b >= 1024 && i < u.length-1) { b /= 1024; i++; }
  return `${b.toFixed(1)}${u[i]}`;
};

const memPercent = (c: any) => {
  if (!c.stats?.memUsed || !c.stats?.memLimit) return 0;
  return Math.min(100, (c.stats.memUsed / c.stats.memLimit) * 100);
};

const getIcon = (containerData: Record<string, any>) => {
  if (!containerData) return 'mdi:docker';
  const containerName = containerData.labels?.['com.docker.compose.project'] || containerData.image || 'docker';
  const baseName = containerName.split(':')[0].split('/').pop()?.toLowerCase() || 'docker';
  return `simple-icons:${baseName}`;
};

const getIconCached = (container: Record<string, any>) => {
  const id = container.id;
  if (iconCache.value[id]) return iconCache.value[id];
  const icon = getIcon(container);
  iconCache.value[id] = icon;
  return icon;
};

const getCpuHistory = (container: Record<string, any>) => {
  const history = historyCache.value[container.id]?.cpu || [];
  const padded = [...Array(HISTORY_LENGTH - history.length).fill(0), ...history];
  return padded;
};

const getMemHistory = (container: Record<string, any>) => {
  const history = historyCache.value[container.id]?.mem || [];
  const padded = [...Array(HISTORY_LENGTH - history.length).fill(0), ...history];
  return padded;
};

onMounted(() => {
  if (!props.hostId) return;
  sshStore.connect(props.hostId).then(() => {
    fetchStats();
    intervalId = setInterval(fetchStats, 5000) as unknown as number;
  });
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(() => props.hostId, (newHostId) => {
  if (intervalId) clearInterval(intervalId);
  stats.value = null;
  historyCache.value = {};
  if (!newHostId) return;
  sshStore.connect(newHostId).then(() => {
    fetchStats();
    intervalId = setInterval(fetchStats, 5000) as unknown as number;
  });
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

/* Root container - fixed height, no overflow */
.docker-manager {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8e8;
}

/* Background layers */
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

/* Empty state */
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
  letter-spacing: -0.01em;
}

/* Loader */
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

/* Main content */
.main-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow: hidden;
}

/* Header */
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
  line-height: 1.2;
}

.subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  letter-spacing: -0.01em;
}

/* Toolbar */
.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 320px;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: rgba(255, 255, 255, 0.25);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e8e8e8;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-input:focus {
  outline: none;
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(127, 161, 195, 0.4);
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.filter-toggle:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
}

.filter-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6b9e7d;
}

.filter-label {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  letter-spacing: -0.01em;
}

.filter-badge {
  padding: 0.25rem 0.625rem;
  background: rgba(107, 158, 125, 0.15);
  color: #8bc4a0;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.total-badge {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
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
  letter-spacing: -0.01em;
}

.badge-text strong {
  color: #ffffff;
  font-weight: 600;
  margin-left: 0.25rem;
}

/* Groups container - scrollable */
.groups-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  margin-right: -0.5rem;
}

.groups-container::-webkit-scrollbar {
  width: 8px;
}

.groups-container::-webkit-scrollbar-track {
  background: transparent;
}

.groups-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.groups-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.group {
  margin-bottom: 2.5rem;
}

/* Group header */
.group-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0.5rem;
  margin: 0 -0.5rem 1.5rem -0.5rem;
  background: rgba(10, 14, 18, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collapse-btn {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

.collapse-icon {
  font-size: 20px;
  transition: transform 0.2s ease;
}

.group-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.group-count {
  padding: 0.25rem 0.625rem;
  background: rgba(107, 140, 174, 0.15);
  color: #7fa1c3;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid rgba(107, 140, 174, 0.2);
}

.group-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.stat-icon {
  font-size: 16px;
}

.stat-icon.cpu {
  color: #7fa1c3;
}

.stat-icon.mem {
  color: #8bc4a0;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  color: #ffffff;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
}

/* Cards grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

/* Container card */
.container-card {
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.container-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* Card header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.card-header-left {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  flex: 1;
  min-width: 0;
}

.card-icon-wrapper {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 35, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.container-card:hover .card-icon-wrapper {
  background: rgba(35, 40, 48, 0.8);
  border-color: rgba(127, 161, 195, 0.2);
}

.card-icon {
  font-size: 22px;
  color: #7fa1c3;
}

.card-title-block {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.375rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;
}

.container-card:hover .card-title {
  color: #7fa1c3;
}

.card-image {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
}

.status-badge {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 8px;
  letter-spacing: 0.02em;
  font-family: 'JetBrains Mono', monospace;
}

.status-badge.status-up {
  background: rgba(107, 158, 125, 0.15);
  color: #8bc4a0;
  border: 1px solid rgba(107, 158, 125, 0.25);
}

.status-badge.status-exited {
  background: rgba(214, 93, 93, 0.15);
  color: #d68a8a;
  border: 1px solid rgba(214, 93, 93, 0.25);
}

.status-badge.status-other {
  background: rgba(140, 140, 150, 0.15);
  color: #a8a8b4;
  border: 1px solid rgba(140, 140, 150, 0.25);
}

/* Compose info */
.compose-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: rgba(107, 140, 174, 0.08);
  border: 1px solid rgba(107, 140, 174, 0.12);
  border-radius: 10px;
  font-size: 0.8125rem;
}

.compose-icon {
  font-size: 16px;
  color: #7fa1c3;
}

.compose-project {
  color: #7fa1c3;
  font-weight: 600;
}

.compose-separator {
  color: rgba(255, 255, 255, 0.2);
}

.compose-service {
  color: rgba(255, 255, 255, 0.5);
}

/* Metadata */
.metadata {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: rgba(30, 35, 42, 0.4);
  border-radius: 8px;
  font-size: 0.8125rem;
}

.meta-icon {
  font-size: 16px;
}

.meta-icon.health {
  color: #91d4ac;
}

.meta-icon.restart {
  color: #b19dd4;
}

.meta-text {
  color: rgba(255, 255, 255, 0.6);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

/* Metric block */
.metric-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.metric-icon {
  font-size: 16px;
}

.metric-icon.cpu {
  color: #7fa1c3;
}

.metric-icon.mem {
  color: #8bc4a0;
}

.metric-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.metric-value.cpu {
  color: #7fa1c3;
}

.metric-value.mem {
  color: #8bc4a0;
}

/* Chart */
.chart {
  height: 56px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  background: rgba(30, 35, 42, 0.4);
  border-radius: 8px;
  padding: 0.625rem 0.5rem;
}

.bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.cpu-bar {
  background: linear-gradient(to top, #5f8aa6 0%, #7fa1c3 100%);
}

.mem-bar {
  background: linear-gradient(to top, #6ba87d 0%, #8bc4a0 100%);
}

/* Controls */
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn:not(:disabled):hover {
  transform: scale(1.08);
}

.control-btn:not(:disabled):active {
  transform: scale(0.95);
}

.control-btn.start {
  background: rgba(107, 158, 125, 0.15);
  color: #8bc4a0;
}

.control-btn.start:not(:disabled):hover {
  background: rgba(107, 158, 125, 0.25);
}

.control-btn.stop {
  background: rgba(214, 93, 93, 0.15);
  color: #d68a8a;
}

.control-btn.stop:not(:disabled):hover {
  background: rgba(214, 93, 93, 0.25);
}

.control-btn.restart {
  background: rgba(107, 140, 174, 0.15);
  color: #7fa1c3;
}

.control-btn.restart:not(:disabled):hover {
  background: rgba(107, 140, 174, 0.25);
}

.control-btn.logs {
  background: rgba(140, 140, 150, 0.12);
  color: #a8a8b4;
}

.control-btn.logs:hover {
  background: rgba(140, 140, 150, 0.2);
}

.control-icon {
  font-size: inherit;
}

/* Card animations */
.card-enter-active,
.card-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.card-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive adjustments */
@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem;
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    max-width: none;
  }
  
  .total-badge {
    margin-left: 0;
  }
}
</style>