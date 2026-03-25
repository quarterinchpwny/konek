<template>
  <MediaWidget
    title="Sonarr"
    icon="simple-icons:sonarr"
    accent-class="text-[#7fa1c3]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Sonarr"
  >
    <template #stats>
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.6rem] uppercase tracking-[0.05em] text-white/40">Series</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ seriesCount }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.6rem] uppercase tracking-[0.05em] text-white/40">Episodes</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ episodeCount }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.6rem] uppercase tracking-[0.05em] text-white/40">Missing</span>
          <span class="block text-[1.2rem] font-bold text-[#f2cf8d]">{{ missingCount }}</span>
        </div>
      </div>
    </template>

    <div v-if="queue.length">
      <h4 class="mb-[0.45rem] text-[0.6rem] uppercase tracking-[0.05em] text-white/40">Queue</h4>
      <div class="flex flex-col gap-[0.35rem]">
        <div
          v-for="item in queue.slice(0, mediaItemLimits.queue)"
          :key="item.id"
          class="rounded-lg border border-white/6 bg-white/2 px-2 py-[0.42rem]"
        >
          <div class="flex justify-between gap-2">
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] text-white/85">{{ item.title }}</span>
            <span class="text-[0.6rem] text-white/40">{{ item.status }}</span>
          </div>
          <div class="mt-[0.3rem] flex items-center justify-between gap-2">
            <div class="h-1 flex-1 overflow-hidden rounded bg-white/6">
              <div
                class="h-full bg-[linear-gradient(90deg,#7fa1c3,#a3c4e8)]"
                :style="{ width: `${item.progress}%` }"
              ></div>
            </div>
            <span class="text-[0.6rem] text-white/40">{{ item.progress }}%</span>
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
