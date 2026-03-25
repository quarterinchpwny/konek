<template>
  <MediaWidget
    title="Prowlarr"
    icon="mdi:satellite-variant"
    accent-class="text-[#ffca7a]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Prowlarr"
  >
    <template #stats>
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Indexers</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ total }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Healthy</span>
          <span class="block text-[1.2rem] font-bold text-[#8bd5a8]">{{ healthy }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Failing</span>
          <span class="block text-[1.2rem] font-bold text-[#f2cf8d]">{{ failing }}</span>
        </div>
      </div>
    </template>

    <div v-if="indexers.length">
      <h4 class="mb-[0.45rem] text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Status</h4>
      <div class="flex flex-col gap-[0.35rem]">
        <div
          v-for="item in indexers.slice(0, mediaItemLimits.indexers)"
          :key="item.id"
          class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[0.45rem] rounded-lg border border-white/6 bg-white/2 px-2 py-[0.45rem]"
        >
          <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] text-white/88">{{ item.name }}</span>
          <span class="text-[0.58rem] text-white/40">{{ item.latency }}</span>
          <span
            class="border px-[0.3rem] py-[0.08rem] text-[0.56rem] uppercase"
            :class="indexerStatusClasses(item.status)"
          >
            {{ item.status }}
          </span>
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

const indexerStatusClasses = (status: string) =>
  status === "ok"
    ? "border-[#8bd5a8]/35 text-[#8bd5a8]"
    : "border-[#f2cf8d]/35 text-[#f2cf8d]";
</script>
