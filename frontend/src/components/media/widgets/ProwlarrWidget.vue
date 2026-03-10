<template>
  <MediaWidget
    title="Prowlarr"
    icon="mdi:satellite-variant"
    accent-class="prowlarr"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Prowlarr"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Indexers</span><span class="stat-value">{{ total }}</span></div>
        <div class="stat-box"><span class="stat-label">Healthy</span><span class="stat-value success">{{ healthy }}</span></div>
        <div class="stat-box"><span class="stat-label">Failing</span><span class="stat-value warning">{{ failing }}</span></div>
      </div>
    </template>

    <div v-if="indexers.length" class="widget-section">
      <h4 class="section-title">Status</h4>
      <div class="indexer-items">
        <div v-for="item in indexers.slice(0, mediaItemLimits.indexers)" :key="item.id" class="indexer-item">
          <span class="indexer-name">{{ item.name }}</span>
          <span class="indexer-latency">{{ item.latency }}</span>
          <span class="indexer-status" :class="item.status">{{ item.status }}</span>
        </div>
      </div>
    </div>
  </MediaWidget>
</template>

<script setup lang="ts">
import MediaWidget from "@/components/media/MediaWidget.vue";
import { mediaItemLimits } from "@/composables/media/constants";
import type { IndexerStatusItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  total: number;
  healthy: number;
  failing: number;
  indexers: IndexerStatusItem[];
}>();
</script>

<style scoped>
.prowlarr { color: #ffca7a; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.stat-box, .indexer-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
.stat-box { padding: 0.45rem; }
.stat-label, .section-title, .indexer-latency { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; }
.stat-label, .section-title { text-transform: uppercase; letter-spacing: 0.04em; }
.section-title { margin: 0 0 0.45rem; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1.2rem; }
.success { color: #8bd5a8; }
.warning { color: #f2cf8d; }
.indexer-items { display: flex; flex-direction: column; gap: 0.35rem; }
.indexer-item { padding: 0.45rem 0.5rem; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.45rem; align-items: center; }
.indexer-name { color: rgba(255, 255, 255, 0.88); font-size: 0.68rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.indexer-status { font-size: 0.56rem; text-transform: uppercase; padding: 0.08rem 0.3rem; border: 1px solid transparent; }
.indexer-status.ok { color: #8bd5a8; border-color: rgba(139, 213, 168, 0.35); }
.indexer-status.failing { color: #f2cf8d; border-color: rgba(242, 207, 141, 0.35); }
</style>
