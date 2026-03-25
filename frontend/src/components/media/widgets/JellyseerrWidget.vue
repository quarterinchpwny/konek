<template>
  <MediaWidget
    title="Jellyseerr"
    icon="simple-icons:jellyseerr"
    accent-class="text-[#8bd5a8]"
    :status-class="statusClass"
    :status-text="statusText"
    :meta="meta"
    :href="configUrl"
    external-label="Open Jellyseerr"
  >
    <template #stats>
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Pending</span>
          <span class="block text-[1.2rem] font-bold text-[#f2cf8d]">{{ pending }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Approved</span>
          <span class="block text-[1.2rem] font-bold text-white/90">{{ approved }}</span>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/2 p-[0.45rem]">
          <span class="block text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Available</span>
          <span class="block text-[1.2rem] font-bold text-[#8bd5a8]">{{ available }}</span>
        </div>
      </div>
    </template>

    <div v-if="requests.length">
      <h4 class="mb-[0.45rem] text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Recent Requests</h4>
      <div class="flex flex-col gap-[0.35rem]">
        <div
          v-for="item in requests.slice(0, mediaItemLimits.requests)"
          :key="item.id"
          class="flex justify-between gap-2 rounded-lg border border-white/6 bg-white/2 px-2 py-[0.42rem]"
        >
          <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] text-white/85">{{ item.title }}</span>
          <span
            class="border px-[0.35rem] py-[0.1rem] text-[0.58rem] uppercase tracking-[0.08em]"
            :class="requestStatusClasses(item.status)"
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
import type { RequestItem } from "@/types/media";

defineProps<{
  configUrl?: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  pending: number;
  approved: number;
  available: number;
  requests: RequestItem[];
}>();

const requestStatusClasses = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "pending") {
    return "border-[#f2cf8d]/40 text-[#f2cf8d]";
  }

  if (normalizedStatus === "approved") {
    return "border-[#a3c4e8]/40 text-[#a3c4e8]";
  }

  return "border-[#8bd5a8]/40 text-[#8bd5a8]";
};
</script>
