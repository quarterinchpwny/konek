<template>
  <article class="rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-3">
    <header class="mb-[0.7rem] flex items-start justify-between gap-3">
      <div>
        <p class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Library Feed</p>
        <h3 class="mt-[0.15rem] text-[0.95rem] text-white/90">Recently Added</h3>
      </div>
      <span class="text-base font-bold text-[#a3c4e8]">{{ items.length }}</span>
    </header>

    <div v-if="items.length" class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[0.45rem]">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex min-w-0 flex-col gap-1 rounded-lg border border-white/6 bg-white/2 p-[0.55rem]"
      >
        <span
          class="w-fit border px-[0.28rem] py-[0.06rem] text-[0.54rem] uppercase tracking-[0.08em]"
          :class="recentSourceClasses(item.source)"
        >
          {{ item.source }}
        </span>
        <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] text-white/88">{{ item.title }}</span>
        <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] text-white/52">{{ item.subtitle }}</span>
        <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">{{ item.addedAtLabel }}</span>
      </div>
    </div>
    <div v-else class="text-[0.72rem] text-white/45">No recently added media found.</div>
  </article>
</template>

<script setup lang="ts">
import type { RecentMediaItem } from "@/types/media";

defineProps<{ items: RecentMediaItem[] }>();

const recentSourceClasses = (source: string) => {
  if (source === "jellyfin") {
    return "border-[#9eb1c5]/35 text-[#9eb1c5]";
  }

  if (source === "sonarr") {
    return "border-[#7fa1c3]/35 text-[#7fa1c3]";
  }

  return "border-[#a3c4e8]/35 text-[#a3c4e8]";
};
</script>
