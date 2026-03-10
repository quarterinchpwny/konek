<template>
  <MediaWidget
    title="Radarr"
    icon="simple-icons:radarr"
    accent-class="radarr"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Radarr"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Movies</span><span class="stat-value">{{ movieCount }}</span></div>
        <div class="stat-box"><span class="stat-label">Available</span><span class="stat-value success">{{ availableCount }}</span></div>
        <div class="stat-box"><span class="stat-label">Missing</span><span class="stat-value warning">{{ missingCount }}</span></div>
      </div>
    </template>
  </MediaWidget>
</template>

<script setup lang="ts">
import MediaWidget from "@/components/media/MediaWidget.vue";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  movieCount: number;
  availableCount: number;
  missingCount: number;
}>();
</script>

<style scoped>
.radarr { color: #a3c4e8; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
.stat-box { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); padding: 0.45rem; border-radius: 8px; }
.stat-label { display: block; color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1.2rem; }
.warning { color: #f2cf8d; }
.success { color: #8bd5a8; }
</style>
