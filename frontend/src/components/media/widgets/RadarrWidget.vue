<template>
  <MediaWidget
    title="Radarr"
    icon="simple-icons:radarr"
    accent-class="text-[#a3c4e8]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Radarr"
  >
    <template #stats>
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Movies</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ movieCount }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Available</span>
          <span class="block text-[1.2rem] font-bold text-[#8bd5a8]">{{ availableCount }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Missing</span>
          <span class="block text-[1.2rem] font-bold text-[#f2cf8d]">{{ missingCount }}</span>
        </div>
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
