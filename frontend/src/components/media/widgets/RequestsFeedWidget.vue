<template>
  <article class="feed-widget">
    <header class="feed-header">
      <div>
        <p class="feed-kicker">Global Feed</p>
        <h3>Requests</h3>
      </div>
      <span class="feed-count">{{ requests.length }}</span>
    </header>

    <div v-if="requests.length" class="feed-items">
      <div v-for="item in requests" :key="item.id" class="feed-item">
        <div class="feed-main">
          <span class="feed-title">{{ item.title }}</span>
          <span class="feed-meta">{{ item.requestedBy || "Unknown requester" }} · {{ item.createdAt || "Unknown date" }}</span>
        </div>
        <div class="feed-side">
          <span class="feed-type">{{ item.mediaType || "media" }}</span>
          <span class="feed-status" :class="item.status.toLowerCase()">{{ item.status }}</span>
        </div>
      </div>
    </div>
    <div v-else class="feed-empty">No requests found.</div>
  </article>
</template>

<script setup lang="ts">
import type { RequestItem } from "@/types/media";

defineProps<{ requests: RequestItem[] }>();
</script>

<style scoped>
.feed-widget { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(20, 25, 32, 0.8); border-radius: 12px; padding: 0.75rem; }
.feed-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.7rem; }
.feed-kicker, .feed-meta, .feed-type { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; }
.feed-header h3 { margin: 0.15rem 0 0; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem; }
.feed-count { color: #8bd5a8; font-size: 1rem; font-weight: 700; }
.feed-items { display: flex; flex-direction: column; gap: 0.35rem; }
.feed-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; padding: 0.5rem; display: flex; justify-content: space-between; gap: 0.75rem; }
.feed-main { min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.feed-title { color: rgba(255, 255, 255, 0.88); font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.feed-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.feed-status { font-size: 0.56rem; text-transform: uppercase; padding: 0.08rem 0.3rem; border: 1px solid transparent; }
.feed-status.pending { color: #f2cf8d; border-color: rgba(242, 207, 141, 0.4); }
.feed-status.approved { color: #a3c4e8; border-color: rgba(163, 196, 232, 0.4); }
.feed-status.available { color: #8bd5a8; border-color: rgba(139, 213, 168, 0.4); }
.feed-empty { color: rgba(255, 255, 255, 0.45); font-size: 0.72rem; }
</style>
