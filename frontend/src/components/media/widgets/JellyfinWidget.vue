<template>
  <MediaWidget
    title="Jellyfin"
    icon="simple-icons:jellyfin"
    accent-class="text-[#9eb1c5]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Jellyfin"
  >
    <template #stats>
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Version</span>
          <span class="block text-[0.85rem] font-bold text-white/90">{{ version || "-" }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Users</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ users }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Now Playing</span>
          <span class="block text-[1.2rem] font-bold text-[#8bd5a8]">{{ active }}</span>
        </div>
      </div>
    </template>

    <div v-if="nowPlaying.length">
      <h4 class="mb-[0.45rem] text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Now Playing</h4>
      <div class="flex flex-col gap-[0.35rem]">
        <div
          v-for="item in nowPlaying.slice(0, mediaItemLimits.nowPlaying)"
          :key="item.id"
          class="flex gap-2 rounded-lg border border-white/6 bg-white/2 px-2 py-[0.42rem]"
        >
          <Icon icon="mdi:play-circle" class="text-[18px] text-[#7fa1c3]" />
          <div class="flex min-w-0 flex-col gap-[0.15rem]">
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] text-white/85">{{ item.title }}</span>
            <span class="text-[0.58rem] text-white/40">{{ item.user }}</span>
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
