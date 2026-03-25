<template>
  <div class="docker-manager">
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
import { toRef } from "vue";
import DockerLogsViewer from './DockerLogsViewer.vue';
import { Icon } from '@iconify/vue';
import { useDockerManager } from "../composables/useDockerManager";

const props = defineProps<{ hostId?: number }>();

const {
  HISTORY_LENGTH,
  dockerInfo,
  isLoading,
  showLogsModal,
  selectedContainerId,
  search,
  showOnlyRunning,
  collapsed,
  runningCount,
  groupedContainers,
  stackTotals,
  handleAction,
  openLogs,
  getStatusClass,
  formatBytes,
  getIconCached,
  getCpuHistory,
  getMemHistory,
} = useDockerManager(toRef(props, "hostId"));
</script>

<style scoped>
@reference "../assets/css/main.css";

.docker-manager {
  @apply relative h-full w-full overflow-auto text-[#e8e8e8];
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
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
  @apply text-lg tracking-[-0.01em] text-white/40;
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
  @apply relative z-[1] flex h-full flex-col overflow-hidden px-5 py-4;
}

.header {
  @apply mb-4 shrink-0;
}

.header-title {
  @apply flex items-start gap-4;
}

.title-icon {
  @apply mt-1 text-[32px] text-[#7fa1c3];
}

.title {
  @apply mb-1 text-xl font-bold leading-[1.2] tracking-[-0.03em] text-white;
}

.subtitle {
  @apply text-[0.78rem] tracking-[-0.01em] text-white/45;
}

.toolbar {
  @apply mb-4 flex shrink-0 flex-wrap items-center gap-4;
}

.search-wrapper {
  @apply relative max-w-[420px] min-w-[220px] flex-1;
}

.search-icon {
  @apply pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-white/25;
}

.search-input {
  @apply w-full rounded-xl border border-white/8 bg-[rgba(20,25,32,0.5)] px-[0.8rem] py-[0.65rem] pl-[2.4rem] text-[0.9375rem] text-[#e8e8e8] transition-all;
  font-family: inherit;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  @apply text-white/30;
}

.search-input:focus {
  @apply border-[#7fa1c366] bg-[rgba(25,30,38,0.7)] outline-none;
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
}

.filter-toggle {
  @apply flex cursor-pointer select-none items-center gap-3 rounded-xl border border-white/8 bg-[rgba(20,25,32,0.5)] px-[0.9rem] py-[0.65rem] transition-all;
  transition: all 0.2s ease;
}

.filter-toggle:hover {
  @apply border-white/12 bg-[rgba(25,30,38,0.7)];
}

.filter-toggle input[type="checkbox"] {
  @apply h-[18px] w-[18px] cursor-pointer;
  cursor: pointer;
  accent-color: #6b9e7d;
}

.filter-label {
  @apply text-[0.9375rem] font-medium tracking-[-0.01em] text-white/70;
}

.filter-badge {
  @apply rounded-md bg-[#6b9e7d26] px-2.5 py-1 text-[0.8125rem] font-semibold text-[#8bc4a0];
  font-family: 'JetBrains Mono', monospace;
}

.total-badge {
  @apply ml-auto flex items-center gap-2.5 rounded-xl border border-white/8 bg-[rgba(20,25,32,0.5)] px-[0.9rem] py-[0.65rem];
}

.badge-icon {
  @apply text-[20px] text-[#7fa1c3];
}

.badge-text {
  @apply text-[0.9375rem] tracking-[-0.01em] text-white/60;
}

.badge-text strong {
  @apply ml-1 font-semibold text-white;
}

.groups-container {
  @apply -mr-2 flex-1 overflow-x-hidden overflow-y-auto pr-2;
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
  @apply mb-6;
}

.group-header {
  @apply sticky top-0 z-10 -mx-2 mb-[0.9rem] flex items-center justify-between border-b border-white/6 bg-[rgba(10,14,18,0.85)] px-2 py-[0.65rem];
  backdrop-filter: blur(12px);
}

.group-header-left {
  @apply flex items-center gap-3;
}

.collapse-btn {
  @apply flex cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-2 text-white/40 transition-all;
}

.collapse-btn:hover {
  @apply bg-white/5 text-white/60;
}

.collapse-icon {
  @apply text-[20px];
  transition: transform 0.2s ease;
}

.group-title {
  @apply text-base font-semibold uppercase tracking-[0.05em] text-white/85;
}

.group-count {
  @apply rounded-md border border-[#6b8cae33] bg-[#6b8cae26] px-2.5 py-1 text-xs font-semibold text-[#7fa1c3];
  font-family: 'JetBrains Mono', monospace;
}

.group-stats {
  @apply flex items-center gap-6;
}

.stat-item {
  @apply flex items-center gap-2 text-sm;
}

.stat-icon {
  @apply text-base;
}

.stat-icon.cpu {
  @apply text-[#7fa1c3];
}

.stat-icon.mem {
  @apply text-[#8bc4a0];
}

.stat-label {
  @apply text-white/50;
}

.stat-value {
  @apply text-[0.8125rem] font-semibold text-white;
  font-family: 'JetBrains Mono', monospace;
}

.cards-grid {
  @apply grid gap-5;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

.container-card {
  @apply flex flex-col gap-[0.8rem] rounded-[10px] border border-white/6 bg-[rgba(20,25,32,0.5)] p-4 transition-all;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.container-card:hover {
  @apply border-white/12 bg-[rgba(25,30,38,0.7)] shadow-[0_8px_24px_rgba(0,0,0,0.3)];
  transform: translateY(-2px);
}

.card-header {
  @apply flex items-start justify-between gap-4;
}

.card-header-left {
  @apply flex min-w-0 flex-1 items-start gap-3.5;
}

.card-icon-wrapper {
  @apply flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/8 bg-[rgba(30,35,42,0.6)] transition-all;
  transition: all 0.2s ease;
}

.container-card:hover .card-icon-wrapper {
  @apply border-[#7fa1c333] bg-[rgba(35,40,48,0.8)];
}

.card-icon {
  @apply text-[22px] text-[#7fa1c3];
}

.card-title-block {
  @apply min-w-0 flex-1 pt-0.5;
}

.card-title {
  @apply mb-1.5 truncate text-base font-semibold tracking-[-0.01em] text-white transition-colors;
  transition: color 0.2s ease;
}

.container-card:hover .card-title {
  @apply text-[#7fa1c3];
}

.card-image {
  @apply truncate text-[0.8125rem] text-white/35;
  font-family: 'JetBrains Mono', monospace;
}

.status-badge {
  @apply shrink-0 rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-semibold tracking-[0.02em];
  font-family: 'JetBrains Mono', monospace;
}

.status-badge.status-up {
  @apply border border-[#6b9e7d40] bg-[#6b9e7d26] text-[#8bc4a0];
}

.status-badge.status-exited {
  @apply border border-[#d65d5d40] bg-[#d65d5d26] text-[#d68a8a];
}

.status-badge.status-other {
  @apply border border-[#8c8c9640] bg-[#8c8c9626] text-[#a8a8b4];
}

.compose-info {
  @apply flex items-center gap-2 rounded-[10px] border border-[#6b8cae1f] bg-[#6b8cae14] p-3.5 text-[0.8125rem];
}

.compose-icon {
  @apply text-base text-[#7fa1c3];
}

.compose-project {
  @apply font-semibold text-[#7fa1c3];
}

.compose-separator {
  @apply text-white/20;
}

.compose-service {
  @apply text-white/50;
}

.metadata {
  @apply grid grid-cols-2 gap-3;
}

.meta-item {
  @apply flex items-center gap-2 rounded-lg bg-[rgba(30,35,42,0.4)] px-3.5 py-2.5 text-[0.8125rem];
}

.meta-icon {
  @apply text-base;
}

.meta-icon.health {
  @apply text-[#91d4ac];
}

.meta-icon.restart {
  @apply text-[#b19dd4];
}

.meta-text {
  @apply text-xs text-white/60;
  font-family: 'JetBrains Mono', monospace;
}

.metric-block {
  @apply flex flex-col gap-3;
}

.metric-header {
  @apply flex items-center justify-between;
}

.metric-label {
  @apply flex items-center gap-2 text-sm font-medium text-white/60;
}

.metric-icon {
  @apply text-base;
}

.metric-icon.cpu {
  @apply text-[#7fa1c3];
}

.metric-icon.mem {
  @apply text-[#8bc4a0];
}

.metric-value {
  @apply text-sm font-semibold;
  font-family: 'JetBrains Mono', monospace;
}

.metric-value.cpu {
  @apply text-[#7fa1c3];
}

.metric-value.mem {
  @apply text-[#8bc4a0];
}

.chart {
  @apply flex h-14 items-end gap-0.5 rounded-lg bg-[rgba(30,35,42,0.4)] px-2 py-2.5;
}

.bar {
  @apply min-h-[2px] flex-1 rounded-[2px];
  transition: all 0.3s ease;
}

.cpu-bar {
  background: linear-gradient(to top, #5f8aa6 0%, #7fa1c3 100%);
}

.mem-bar {
  background: linear-gradient(to top, #6ba87d 0%, #8bc4a0 100%);
}

.controls {
  @apply flex items-center justify-between border-t border-white/6 pt-2.5;
}

.control-group {
  @apply flex items-center gap-2;
}

.control-btn {
  @apply flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[9px] border-0 text-[18px] transition-all;
  transition: all 0.2s ease;
}

.control-btn:disabled {
  @apply cursor-not-allowed opacity-30;
}

.control-btn:not(:disabled):hover {
  transform: scale(1.08);
}

.control-btn:not(:disabled):active {
  transform: scale(0.95);
}

.control-btn.start {
  @apply bg-[#6b9e7d26] text-[#8bc4a0];
}

.control-btn.start:not(:disabled):hover {
  @apply bg-[#6b9e7d40];
}

.control-btn.stop {
  @apply bg-[#d65d5d26] text-[#d68a8a];
}

.control-btn.stop:not(:disabled):hover {
  @apply bg-[#d65d5d40];
}

.control-btn.restart {
  @apply bg-[#6b8cae26] text-[#7fa1c3];
}

.control-btn.restart:not(:disabled):hover {
  @apply bg-[#6b8cae40];
}

.control-btn.logs {
  @apply bg-[#8c8c961f] text-[#a8a8b4];
}

.control-btn.logs:hover {
  @apply bg-[#8c8c9633];
}

.control-icon {
  font-size: inherit;
}

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

@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .main-content {
    @apply p-6;
  }
  
  .cards-grid {
    @apply grid-cols-1;
  }
  
  .toolbar {
    @apply flex-col items-stretch;
  }
  
  .search-wrapper {
    @apply max-w-none;
  }
  
  .total-badge {
    @apply ml-0;
  }
}
</style>
