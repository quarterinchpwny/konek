<template>
  <MediaWidget
    title="Jellyseerr"
    icon="simple-icons:jellyseerr"
    accent-class="jellyseerr"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Jellyseerr"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Pending</span><span class="stat-value warning">{{ pending }}</span></div>
        <div class="stat-box"><span class="stat-label">Approved</span><span class="stat-value">{{ approved }}</span></div>
        <div class="stat-box"><span class="stat-label">Available</span><span class="stat-value success">{{ available }}</span></div>
      </div>
    </template>

    <div v-if="requests.length" class="widget-section">
      <h4 class="section-title">Recent Requests</h4>
      <div class="request-items">
        <div v-for="item in requests.slice(0, mediaItemLimits.requests)" :key="item.id" class="request-item">
          <span class="request-title">{{ item.title }}</span>
          <span class="request-status" :class="item.status.toLowerCase()">{{ item.status }}</span>
        </div>
      </div>
    </div>
  </MediaWidget>
</template>

<script setup lang="ts">
import MediaWidget from "@/components/media/MediaWidget.vue";
import { mediaItemLimits } from "@/composables/media/constants";
import type { RequestItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  pending: number;
  approved: number;
  available: number;
  requests: RequestItem[];
}>();
</script>

<style scoped>
.jellyseerr { color: #8bd5a8; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.stat-box, .request-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
.stat-box { padding: 0.45rem; }
.stat-label, .section-title { display: block; color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; }
.section-title { margin: 0 0 0.45rem; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1.2rem; }
.warning { color: #f2cf8d; }
.success { color: #8bd5a8; }
.request-items { display: flex; flex-direction: column; gap: 0.35rem; }
.request-item { padding: 0.42rem 0.5rem; display: flex; justify-content: space-between; gap: 0.5rem; }
.request-title { color: rgba(255, 255, 255, 0.85); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.request-status { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid transparent; padding: 0.1rem 0.35rem; }
.request-status.pending { color: #f2cf8d; border-color: rgba(242, 207, 141, 0.4); }
.request-status.approved { color: #a3c4e8; border-color: rgba(163, 196, 232, 0.4); }
.request-status.available { color: #8bd5a8; border-color: rgba(139, 213, 168, 0.4); }
</style>
