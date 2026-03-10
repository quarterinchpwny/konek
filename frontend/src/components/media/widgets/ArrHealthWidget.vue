<template>
  <article class="health-widget">
    <header class="health-header">
      <div>
        <p class="health-kicker">Health</p>
        <h3>ARR Warnings</h3>
      </div>
      <span class="health-count">{{ items.length }}</span>
    </header>

    <div v-if="items.length" class="health-items">
      <div v-for="item in items" :key="item.id" class="health-item">
        <span class="health-source" :class="item.source">{{ item.source }}</span>
        <div class="health-copy">
          <span class="health-type">{{ item.type }}</span>
          <span class="health-message">{{ item.message }}</span>
        </div>
        <span class="health-level" :class="item.level">{{ item.level }}</span>
      </div>
    </div>
    <div v-else class="health-empty">No ARR health warnings.</div>
  </article>
</template>

<script setup lang="ts">
import type { HealthIssue } from "@/types/media";

defineProps<{ items: HealthIssue[] }>();
</script>

<style scoped>
.health-widget { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(20, 25, 32, 0.8); border-radius: 12px; padding: 0.75rem; }
.health-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.7rem; }
.health-kicker, .health-type { color: rgba(255, 255, 255, 0.4); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; }
.health-header h3 { margin: 0.15rem 0 0; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem; }
.health-count { color: #f2cf8d; font-size: 1rem; font-weight: 700; }
.health-items { display: flex; flex-direction: column; gap: 0.35rem; }
.health-item { border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); border-radius: 8px; padding: 0.5rem; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.45rem; align-items: flex-start; }
.health-source, .health-level { font-size: 0.54rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.06rem 0.28rem; border: 1px solid transparent; }
.health-source.sonarr { color: #7fa1c3; border-color: rgba(127, 161, 195, 0.35); }
.health-source.radarr { color: #a3c4e8; border-color: rgba(163, 196, 232, 0.35); }
.health-copy { min-width: 0; display: flex; flex-direction: column; gap: 0.18rem; }
.health-message { color: rgba(255, 255, 255, 0.86); font-size: 0.68rem; }
.health-level.warning { color: #f2cf8d; border-color: rgba(242, 207, 141, 0.35); }
.health-level.error { color: #f2b4b4; border-color: rgba(242, 180, 180, 0.35); }
.health-level.info { color: #9eb1c5; border-color: rgba(158, 177, 197, 0.35); }
.health-empty { color: rgba(255, 255, 255, 0.45); font-size: 0.72rem; }
</style>
