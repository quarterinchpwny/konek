<template>
  <MediaWidget
    title="Sonarr"
    icon="simple-icons:sonarr"
    accent-class="sonarr"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Sonarr"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Series</span><span class="stat-value">{{ seriesCount }}</span></div>
        <div class="stat-box"><span class="stat-label">Episodes</span><span class="stat-value">{{ episodeCount }}</span></div>
        <div class="stat-box"><span class="stat-label">Missing</span><span class="stat-value warning">{{ missingCount }}</span></div>
      </div>
    </template>

    <div v-if="queue.length" class="widget-section">
      <h4 class="section-title">Queue</h4>
      <div class="queue-items">
        <div v-for="item in queue.slice(0, mediaItemLimits.queue)" :key="item.id" class="queue-item">
          <div class="queue-info">
            <span class="queue-title">{{ item.title }}</span>
            <span class="queue-status-text">{{ item.status }}</span>
          </div>
          <div class="queue-progress">
            <div class="progress-bar"><div class="progress-fill" :style="{ width: `${item.progress}%` }"></div></div>
            <span class="progress-text">{{ item.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
  </MediaWidget>
</template>

<script setup lang="ts">
import MediaWidget from "@/components/media/MediaWidget.vue";
import { mediaItemLimits } from "@/composables/media/constants";
import type { QueueItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  seriesCount: number;
  episodeCount: number;
  missingCount: number;
  queue: QueueItem[];
}>();
</script>

<style scoped>
.sonarr { color: #7fa1c3; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.stat-box, .queue-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
.stat-box { padding: 0.45rem; }
.stat-label, .section-title, .progress-text, .queue-status-text { color: rgba(255, 255, 255, 0.4); font-size: 0.6rem; }
.stat-label, .section-title { text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1.2rem; }
.warning { color: #f2cf8d; }
.queue-items { display: flex; flex-direction: column; gap: 0.35rem; }
.queue-item { padding: 0.42rem 0.5rem; }
.queue-info, .queue-progress { display: flex; justify-content: space-between; gap: 0.5rem; }
.queue-title { color: rgba(255, 255, 255, 0.85); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-progress { margin-top: 0.3rem; align-items: center; }
.progress-bar { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.06); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #7fa1c3, #a3c4e8); }
</style>
