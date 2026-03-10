<template>
  <article class="recent-widget">
    <header class="recent-header">
      <div>
        <p class="recent-kicker">Library Feed</p>
        <h3>Recently Added</h3>
      </div>
      <span class="recent-count">{{ items.length }}</span>
    </header>

    <div v-if="items.length" class="recent-row">
      <div v-for="item in items" :key="item.id" class="recent-card">
        <span class="recent-source" :class="item.source">{{ item.source }}</span>
        <span class="recent-title">{{ item.title }}</span>
        <span class="recent-subtitle">{{ item.subtitle }}</span>
        <span class="recent-date">{{ item.addedAtLabel }}</span>
      </div>
    </div>
    <div v-else class="recent-empty">No recently added media found.</div>
  </article>
</template>

<script setup lang="ts">
import type { RecentMediaItem } from "@/types/media";

defineProps<{ items: RecentMediaItem[] }>();
</script>

<style scoped>
.recent-widget { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(20, 25, 32, 0.8); border-radius: 12px; padding: 0.75rem; }
.recent-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.7rem; }
.recent-kicker, .recent-date { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; }
.recent-header h3 { margin: 0.15rem 0 0; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem; }
.recent-count { color: #a3c4e8; font-size: 1rem; font-weight: 700; }
.recent-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.45rem; }
.recent-card { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; padding: 0.55rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.recent-source { width: fit-content; font-size: 0.54rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.06rem 0.28rem; border: 1px solid transparent; }
.recent-source.jellyfin { color: #9eb1c5; border-color: rgba(158, 177, 197, 0.35); }
.recent-source.sonarr { color: #7fa1c3; border-color: rgba(127, 161, 195, 0.35); }
.recent-source.radarr { color: #a3c4e8; border-color: rgba(163, 196, 232, 0.35); }
.recent-title, .recent-subtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-title { color: rgba(255, 255, 255, 0.88); font-size: 0.72rem; }
.recent-subtitle { color: rgba(255, 255, 255, 0.52); font-size: 0.62rem; }
.recent-empty { color: rgba(255, 255, 255, 0.45); font-size: 0.72rem; }
</style>
