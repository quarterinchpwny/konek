<template>
  <MediaWidget
    title="Jellyfin"
    icon="simple-icons:jellyfin"
    accent-class="jellyfin"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Jellyfin"
  >
    <template #stats>
      <div class="widget-stats">
        <div class="stat-box"><span class="stat-label">Version</span><span class="stat-value small">{{ version || "-" }}</span></div>
        <div class="stat-box"><span class="stat-label">Users</span><span class="stat-value">{{ users }}</span></div>
        <div class="stat-box"><span class="stat-label">Now Playing</span><span class="stat-value success">{{ active }}</span></div>
      </div>
    </template>

    <div v-if="nowPlaying.length" class="widget-section">
      <h4 class="section-title">Now Playing</h4>
      <div class="play-items">
        <div v-for="item in nowPlaying.slice(0, mediaItemLimits.nowPlaying)" :key="item.id" class="play-item">
          <Icon icon="mdi:play-circle" class="play-icon" />
          <div class="play-info">
            <span class="play-title">{{ item.title }}</span>
            <span class="play-user">{{ item.user }}</span>
          </div>
        </div>
      </div>
    </div>
  </MediaWidget>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import MediaWidget from "@/components/media/MediaWidget.vue";
import { mediaItemLimits } from "@/composables/media/constants";
import type { NowPlayingItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  version: string;
  users: number;
  active: number;
  nowPlaying: NowPlayingItem[];
}>();
</script>

<style scoped>
.jellyfin { color: #9eb1c5; }
.widget-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.stat-box, .play-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; }
.stat-box { padding: 0.45rem; }
.stat-label, .section-title, .play-user { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; }
.stat-label, .section-title { text-transform: uppercase; letter-spacing: 0.04em; }
.section-title { margin: 0 0 0.45rem; }
.stat-value { display: block; color: rgba(255, 255, 255, 0.9); font-weight: 700; font-size: 1.2rem; }
.small { font-size: 0.85rem; }
.success { color: #8bd5a8; }
.play-items { display: flex; flex-direction: column; gap: 0.35rem; }
.play-item { padding: 0.42rem 0.5rem; display: flex; gap: 0.5rem; }
.play-icon { font-size: 18px; color: #7fa1c3; }
.play-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.play-title { color: rgba(255, 255, 255, 0.85); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
