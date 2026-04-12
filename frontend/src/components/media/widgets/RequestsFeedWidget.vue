<template>
  <article class="rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-3">
    <header class="mb-[0.7rem] flex items-start justify-between gap-3">
      <div>
        <p class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Global Feed</p>
        <h3 class="mt-[0.15rem] text-[0.95rem] text-white/90">Requests</h3>
      </div>
      <span class="text-base font-bold text-[#8bd5a8]">{{ requests.length }}</span>
    </header>

    <div v-if="requests.length" class="flex flex-col gap-[0.35rem]">
      <div
        v-for="item in requests"
        :key="item.id"
        class="flex justify-between gap-3 rounded-lg border border-white/6 bg-white/2 p-2"
      >
        <div class="flex min-w-0 flex-col gap-[0.2rem]">
          <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] text-white/88">{{ item.title }}</span>
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">
            {{ item.requestedBy || "Unknown requester" }} · {{ item.createdAt || "Unknown date" }}
          </span>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">{{ item.mediaType || "media" }}</span>
          <span
            class="border px-[0.3rem] py-[0.08rem] text-[0.56rem] uppercase"
            :class="feedStatusClasses(item.status)"
          >
            {{ item.status }}
          </span>
        </div>
      </div>
    </div>
    <div v-else class="text-[0.72rem] text-white/45">No requests found.</div>
  </article>
</template>

<script setup lang="ts">
import type { RequestItem } from "@/types/media";

defineProps<{ requests: RequestItem[] }>();

const feedStatusClasses = (status: string) => {
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
