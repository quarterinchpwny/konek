<template>
  <aside class="server-stats" :class="{ compact }">
    <div v-if="!compact" class="stats-bg"></div>
    <div v-if="!compact" class="stats-noise"></div>
    <div class="stats-content">
      <h2 v-if="showHeader" class="stats-header">System Status</h2>

      <div v-if="status === 'offline'" class="status-card status-offline">
        <div class="status-icon">⚠</div>
        <p class="status-text">OFFLINE</p>
      </div>

      <div v-else-if="status === 'auth_failed'" class="status-card status-auth-failed">
        <div class="status-icon">🔒</div>
        <p class="status-text">Authentication Failed</p>
      </div>

      <div v-else-if="!stats" class="status-card status-loading">
        <div class="loader"></div>
        <p class="status-text">Loading stats...</p>
      </div>

      <template v-else>
        <div class="stat-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <div class="widget-icon cpu">
                <Cpu :size="16" />
              </div>
              <span class="widget-title">CPU Usage</span>
            </div>
            <span class="widget-value cpu">{{ stats.cpu.usagePercent.toFixed(1) }}%</span>
          </div>
          
          <div class="history-chart">
            <TransitionGroup name="history-slide" tag="div" class="history-bars">
              <div
                v-for="(value, index) in cpuHistory"
                :key="`cpu-${index}-${value}`"
                class="history-bar-container"
              >
                <div
                  class="history-bar cpu-history"
                  :class="{ 'history-bar-latest': index === cpuHistory.length - 1 }"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </TransitionGroup>
          </div>

          <div class="widget-details">
            <span class="detail-label">Load Average</span>
            <span class="detail-value">
              <strong>{{ stats.cpu.loadAvg?.[0]?.toFixed(2) || '0.00' }}</strong>
            </span>
          </div>
        </div>

        <div class="stat-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <div class="widget-icon mem">
                <Activity :size="16" />
              </div>
              <span class="widget-title">Memory</span>
            </div>
            <span class="widget-value mem">{{ stats.memory.percent.toFixed(1) }}%</span>
          </div>

          <div class="history-chart">
            <TransitionGroup name="history-slide" tag="div" class="history-bars">
              <div
                v-for="(value, index) in memoryHistory"
                :key="`mem-${index}-${value}`"
                class="history-bar-container"
              >
                <div
                  class="history-bar mem-history"
                  :class="{ 'history-bar-latest': index === memoryHistory.length - 1 }"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </TransitionGroup>
          </div>

          <div class="widget-details">
            <span class="detail-label">Total: {{ formatBytes(stats.memory.total) }}</span>
            <span class="detail-value">
              <strong>{{ formatBytes(stats.memory.used) }}</strong> used
            </span>
          </div>
        </div>

        <div v-if="showDocker && stats.docker" class="stat-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <div class="widget-icon docker">
                <Icon icon="mdi:docker" :width="16" />
              </div>
              <span class="widget-title">Docker Containers</span>
            </div>
          </div>

          <div class="docker-list">
            <div
              v-for="container in stats.docker.containers.slice(0, 4)"
              :key="container.id"
              class="docker-item"
            >
              <Icon :icon="getIconCached(container)" class="docker-icon" />
              <span class="docker-name">{{ container.name }}</span>
              <span class="docker-status" :class="getStatusClass(container.status)">
                {{ container.status.split(' ')[0] }}
              </span>
            </div>
          </div>
        </div>

        <div class="stat-widget">
          <div v-for="disk in stats.disk" :key="disk.mount" class="disk-section">
            <div class="widget-header">
              <div class="widget-title-group">
                <div class="widget-icon disk">
                  <HardDrive :size="16" />
                </div>
                <span class="widget-title">Storage</span>
                <span class="widget-subtitle">{{ disk.mount }}</span>
              </div>
              <span class="widget-value disk">{{ disk.percent }}</span>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar disk-bar" :style="{ width: disk.percent }"></div>
            </div>

            <div class="widget-details">
              <span class="detail-label">Total: {{ disk.total }}</span>
              <span class="detail-value">
                <strong>{{ disk.used }}</strong> used
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { Cpu, Activity, HardDrive } from "lucide-vue-next";
import { Icon } from '@iconify/vue';
import { useServerStats } from "../composables/useServerStats";

const props = withDefaults(defineProps<{
  hostId: number;
  compact?: boolean;
  showHeader?: boolean;
  showDocker?: boolean;
}>(), {
  compact: false,
  showHeader: true,
  showDocker: true,
});

const { stats, status, cpuHistory, memoryHistory, formatBytes, getStatusClass, getIconCached } = useServerStats(
  toRef(props, "hostId"),
);
</script>

<style scoped>
@reference "../assets/css/main.css";

.server-stats {
  @apply relative h-full w-full overflow-x-hidden overflow-y-auto text-[#e8e8e8];
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

.server-stats::-webkit-scrollbar {
  width: 6px;
}

.server-stats::-webkit-scrollbar-track {
  background: transparent;
}

.server-stats::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.server-stats::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.stats-bg {
  @apply fixed inset-0 z-0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
}

.stats-noise {
  @apply pointer-events-none fixed inset-0 z-[1];
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

.stats-content {
  @apply relative z-[2] flex flex-col gap-5 p-6;
}

.stats-header {
  @apply mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/40;
}

.status-card {
  @apply flex flex-col items-center justify-center rounded-[14px] border border-white/6 bg-[rgba(20,25,32,0.6)] px-4 py-8 text-center;
  backdrop-filter: blur(8px);
}

.status-icon {
  @apply mb-3 text-[2rem];
}

.status-text {
  @apply text-sm font-semibold tracking-[0.02em];
}

.status-offline .status-text {
  @apply text-[#d68a8a];
}

.status-auth-failed .status-text {
  @apply text-[#e8c368];
}

.status-loading .status-text {
  @apply text-white/50;
}

.loader {
  @apply mb-4 h-8 w-8 rounded-full border-[3px] border-[#7fa1c333] border-t-[#7fa1c3];
  border-top-color: #7fa1c3;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stat-widget {
  @apply rounded-[14px] border border-white/6 bg-[rgba(20,25,32,0.6)] p-5 transition-all;
  backdrop-filter: blur(8px);
}

.stat-widget:hover {
  @apply border-white/12 bg-[rgba(25,30,38,0.7)];
}

.disk-section + .disk-section {
  @apply mt-6 border-t border-white/6 pt-6;
}

.widget-header {
  @apply mb-4 flex items-center justify-between;
}

.widget-title-group {
  @apply flex items-center gap-2;
}

.widget-icon {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-lg;
}

.widget-icon.cpu {
  @apply bg-[#7fa1c326] text-[#7fa1c3];
}

.widget-icon.mem {
  @apply bg-[#a855f726] text-[#b19dd4];
}

.widget-icon.docker {
  @apply bg-[#38bdf826] text-[#7dc4e4];
}

.widget-icon.disk {
  @apply bg-[#10b98126] text-[#8bc4a0];
}

.widget-title {
  @apply text-sm font-semibold tracking-[-0.01em] text-white/85;
}

.widget-subtitle {
  @apply ml-1 text-[0.6875rem] text-white/40;
  font-family: 'JetBrains Mono', monospace;
}

.widget-value {
  @apply text-sm font-bold;
  font-family: 'JetBrains Mono', monospace;
}

.widget-value.cpu {
  @apply text-[#7fa1c3];
}

.widget-value.mem {
  @apply text-[#b19dd4];
}

.widget-value.disk {
  @apply text-[#8bc4a0];
}

.history-chart {
  @apply mb-3.5 h-20 rounded-[10px] border border-white/4 bg-[rgba(10,14,18,0.4)] p-2.5;
}

.history-bars {
  @apply flex h-full items-end justify-between gap-0.5;
}

.history-bar-container {
  @apply flex h-full min-w-[2px] flex-1 items-end;
  min-width: 2px;
}

.history-bar {
  @apply min-h-[2px] w-full rounded-t-[2px];
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.cpu-history {
  @apply bg-[#7fa1c3] opacity-50;
}

.mem-history {
  @apply bg-[#b19dd4] opacity-50;
}

.history-bar-latest {
  opacity: 1 !important;
}

.progress-bar-container {
  @apply relative mb-3.5 h-2 w-full overflow-hidden rounded bg-[rgba(30,35,42,0.4)];
}

.progress-bar {
  @apply h-full rounded;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.disk-bar {
  @apply bg-[#8bc4a0];
}

.widget-details {
  @apply flex items-center justify-between text-xs;
  font-family: 'JetBrains Mono', monospace;
}

.detail-label {
  @apply uppercase tracking-[0.02em] text-white/40;
}

.detail-value {
  @apply text-white/60;
}

.detail-value strong {
  @apply font-semibold text-white;
}

.docker-list {
  @apply flex flex-col gap-3;
}

.docker-item {
  @apply flex items-center gap-3 rounded-[10px] bg-[rgba(30,35,42,0.4)] px-3.5 py-2.5 transition-colors;
}

.docker-item:hover {
  @apply bg-[rgba(35,40,48,0.6)];
}

.docker-icon {
  @apply shrink-0 text-[20px] text-[#7dc4e4];
}

.docker-name {
  @apply flex-1 truncate text-[0.8125rem] text-white/80;
}

.docker-status {
  @apply shrink-0 rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold;
  font-family: 'JetBrains Mono', monospace;
}

.docker-status.status-up {
  @apply border border-[#6b9e7d40] bg-[#6b9e7d26] text-[#8bc4a0];
}

.docker-status.status-exited {
  @apply border border-[#d65d5d40] bg-[#d65d5d26] text-[#d68a8a];
}

.docker-status.status-other {
  @apply border border-[#8c8c9640] bg-[#8c8c9626] text-[#a8a8b4];
}

.history-slide-enter-active {
  transition: all 0.6s ease-out;
}

.history-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.history-slide-leave-active {
  transition: all 0.3s ease-in;
}

.history-slide-leave-to {
  opacity: 0;
}

.server-stats.compact {
  @apply h-auto overflow-visible;
  font-family: inherit;
}

.server-stats.compact .stats-content {
  @apply grid gap-3 p-0;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.server-stats.compact .status-card {
  @apply col-[1/-1] rounded-[10px] bg-white/[0.02] px-3 py-5;
}

.server-stats.compact .stat-widget {
  @apply rounded-[10px] border-white/6 bg-white/[0.02] p-[0.85rem];
  backdrop-filter: none;
}

.server-stats.compact .stat-widget:hover {
  @apply border-white/10 bg-white/[0.04];
}

.server-stats.compact .widget-header {
  @apply mb-[0.7rem];
}

.server-stats.compact .history-chart {
  @apply mb-[0.65rem] h-[58px] p-[0.45rem];
}

.server-stats.compact .widget-title {
  @apply text-[0.78rem];
}

.server-stats.compact .widget-value {
  @apply text-[0.8rem];
}

.server-stats.compact .widget-details {
  @apply text-[0.68rem];
}
</style>
