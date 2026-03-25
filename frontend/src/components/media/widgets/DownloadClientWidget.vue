<template>
  <MediaWidget
    title="Downloads"
    icon="simple-icons:qbittorrent"
    accent-class="text-[#6cb6ff]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open qBittorrent"
  >
    <template #stats>
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Active</span>
          <span class="block text-base font-bold text-white/90">{{ active }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Down</span>
          <span class="block text-base font-bold text-white/90">{{ downloadSpeed }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Up</span>
          <span class="block text-base font-bold text-white/90">{{ uploadSpeed }}</span>
        </div>
      </div>
    </template>

    <div v-if="items.length">
      <h4 class="mb-[0.45rem] text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Queue</h4>
      <div class="flex flex-col gap-[0.35rem]">
        <div
          v-for="item in items.slice(0, mediaItemLimits.downloads)"
          :key="item.id"
          class="rounded-lg border border-white/6 bg-white/2 p-2"
        >
          <div class="flex justify-between gap-2">
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] text-white/88">{{ item.name }}</span>
            <span class="text-[0.58rem] text-white/40">{{ item.state }}</span>
          </div>
          <div class="mt-[0.32rem] flex items-center justify-between gap-2">
            <div class="h-1 flex-1 overflow-hidden rounded bg-white/6">
              <div
                class="h-full bg-[linear-gradient(90deg,#4da3ff,#78c8ff)]"
                :style="{ width: `${item.progress}%` }"
              ></div>
            </div>
            <span class="text-[0.58rem] text-white/40">{{ item.progress }}%</span>
          </div>
          <div class="mt-[0.28rem] flex justify-between gap-2 text-[0.58rem] text-white/40">
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
