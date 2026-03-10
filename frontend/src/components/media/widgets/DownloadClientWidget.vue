<template>
  <MediaWidget
    title="Downloads"
    icon="simple-icons:qbittorrent"
    accent-class="downloads"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open qBittorrent"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Active</span><span class="stat-value">{{ active }}</span></div>
        <div class="stat-box"><span class="stat-label">Down</span><span class="stat-value">{{ downloadSpeed }}</span></div>
        <div class="stat-box"><span class="stat-label">Up</span><span class="stat-value">{{ uploadSpeed }}</span></div>
      </div>
    </template>

    <div v-if="items.length" class="widget-section">
      <h4 class="section-title">Queue</h4>
      <div class="download-items">
        <div v-for="item in items.slice(0, mediaItemLimits.downloads)" :key="item.id" class="download-item">
          <div class="download-top">
            <span class="download-title">{{ item.name }}</span>
            <span class="download-state">{{ item.state }}</span>
          </div>
          <div class="download-progress">
            <div class="progress-bar"><div class="progress-fill" :style="{ width: `${item.progress}%` }"></div></div>
            <span class="progress-text">{{ item.progress }}%</span>
          </div>
          <div class="download-meta">
            <span>{{ item.downloadSpeed }}</span>
            <span>{{ item.uploadSpeed }}</span>
            <span>{{ item.eta }}</span>
          </div>
        </div>
      </div>
    </div>
  </MediaWidget>
</template>

<script setup lang="ts">
import MediaWidget from "@/components/media/MediaWidget.vue";
import { mediaItemLimits } from "@/composables/media/constants";
import type { DownloadItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  active: number;
  downloadSpeed: string;
  uploadSpeed: string;
  items: DownloadItem[];
}>();
</script>

<style scoped>
.downloads { color: #6cb6ff; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.stat-box, .download-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
.stat-box { padding: 0.45rem; }
.stat-label, .section-title, .download-state, .download-meta, .progress-text { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; }
.stat-label, .section-title { text-transform: uppercase; letter-spacing: 0.04em; }
.section-title { margin: 0 0 0.45rem; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1rem; }
.download-items { display: flex; flex-direction: column; gap: 0.35rem; }
.download-item { padding: 0.5rem; }
.download-top, .download-progress, .download-meta { display: flex; justify-content: space-between; gap: 0.5rem; }
.download-title { color: rgba(255, 255, 255, 0.88); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.download-progress { margin-top: 0.32rem; align-items: center; }
.download-meta { margin-top: 0.28rem; }
.progress-bar { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.06); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #4da3ff, #78c8ff); }
</style>
