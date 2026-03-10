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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.server-stats {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8e8;
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

/* Background */
.stats-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  z-index: 0;
}

.stats-noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Content */
.stats-content {
  position: relative;
  z-index: 2;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.stats-header {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 0.5rem 0;
}

/* Status cards */
.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  text-align: center;
  backdrop-filter: blur(8px);
}

.status-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.status-text {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.02em;
}

.status-offline .status-text {
  color: #d68a8a;
}

.status-auth-failed .status-text {
  color: #e8c368;
}

.status-loading .status-text {
  color: rgba(255, 255, 255, 0.5);
}

/* Loader */
.loader {
  width: 32px;
  height: 32px;
  margin-bottom: 1rem;
  border: 3px solid rgba(127, 161, 195, 0.2);
  border-top-color: #7fa1c3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stat widget */
.stat-widget {
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1.25rem;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.stat-widget:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
}

.disk-section + .disk-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* Widget header */
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.widget-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.widget-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
}

.widget-icon.cpu {
  background: rgba(127, 161, 195, 0.15);
  color: #7fa1c3;
}

.widget-icon.mem {
  background: rgba(168, 85, 247, 0.15);
  color: #b19dd4;
}

.widget-icon.docker {
  background: rgba(56, 189, 248, 0.15);
  color: #7dc4e4;
}

.widget-icon.disk {
  background: rgba(16, 185, 129, 0.15);
  color: #8bc4a0;
}

.widget-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.01em;
}

.widget-subtitle {
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 0.25rem;
}

.widget-value {
  font-size: 0.875rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.widget-value.cpu {
  color: #7fa1c3;
}

.widget-value.mem {
  color: #b19dd4;
}

.widget-value.disk {
  color: #8bc4a0;
}

/* History Chart */
.history-chart {
  height: 80px;
  margin-bottom: 0.875rem;
  background: rgba(10, 14, 18, 0.4);
  border-radius: 10px;
  padding: 0.625rem;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.history-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  gap: 2px;
}

.history-bar-container {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  min-width: 2px;
}

.history-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.cpu-history {
  background: #7fa1c3;
  opacity: 0.5;
}

.mem-history {
  background: #b19dd4;
  opacity: 0.5;
}

.history-bar-latest {
  opacity: 1 !important;
}

/* Progress bar */
.progress-bar-container {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(30, 35, 42, 0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.875rem;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.disk-bar {
  background: #8bc4a0;
}

/* Widget details */
.widget-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

.detail-label {
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.detail-value {
  color: rgba(255, 255, 255, 0.6);
}

.detail-value strong {
  color: #ffffff;
  font-weight: 600;
}

/* Docker list */
.docker-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.docker-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: rgba(30, 35, 42, 0.4);
  border-radius: 10px;
  transition: background 0.2s ease;
}

.docker-item:hover {
  background: rgba(35, 40, 48, 0.6);
}

.docker-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: #7dc4e4;
}

.docker-name {
  flex: 1;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docker-status {
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.docker-status.status-up {
  background: rgba(107, 158, 125, 0.15);
  color: #8bc4a0;
  border: 1px solid rgba(107, 158, 125, 0.25);
}

.docker-status.status-exited {
  background: rgba(214, 93, 93, 0.15);
  color: #d68a8a;
  border: 1px solid rgba(214, 93, 93, 0.25);
}

.docker-status.status-other {
  background: rgba(140, 140, 150, 0.15);
  color: #a8a8b4;
  border: 1px solid rgba(140, 140, 150, 0.25);
}

/* Animations */
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
  height: auto;
  overflow: visible;
  font-family: inherit;
}

.server-stats.compact .stats-content {
  padding: 0;
  gap: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.server-stats.compact .status-card {
  grid-column: 1 / -1;
  padding: 1.25rem 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.server-stats.compact .stat-widget {
  border-radius: 10px;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
  backdrop-filter: none;
}

.server-stats.compact .stat-widget:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.09);
}

.server-stats.compact .widget-header {
  margin-bottom: 0.7rem;
}

.server-stats.compact .history-chart {
  height: 58px;
  margin-bottom: 0.65rem;
  padding: 0.45rem;
}

.server-stats.compact .widget-title {
  font-size: 0.78rem;
}

.server-stats.compact .widget-value {
  font-size: 0.8rem;
}

.server-stats.compact .widget-details {
  font-size: 0.68rem;
}
</style>
