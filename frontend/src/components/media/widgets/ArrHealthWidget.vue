<template>
  <article class="rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-3">
    <header class="mb-[0.7rem] flex items-start justify-between gap-3">
      <div>
        <p class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">Health</p>
        <h3 class="mt-[0.15rem] text-[0.95rem] text-white/90">ARR Warnings</h3>
      </div>
      <span class="text-base font-bold text-[#f2cf8d]">{{ items.length }}</span>
    </header>

    <div v-if="items.length" class="flex flex-col gap-[0.35rem]">
      <div
        v-for="item in items"
        :key="item.id"
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-[0.45rem] rounded-lg border border-white/6 bg-white/2 p-2"
      >
        <span
          class="border px-[0.28rem] py-[0.06rem] text-[0.54rem] uppercase tracking-[0.08em]"
          :class="healthSourceClasses(item.source)"
        >
          {{ item.source }}
        </span>
        <div class="flex min-w-0 flex-col gap-[0.18rem]">
          <span class="text-[0.58rem] uppercase tracking-[0.04em] text-white/40">{{ item.type }}</span>
          <span class="text-[0.68rem] text-white/86">{{ item.message }}</span>
        </div>
        <span
          class="border px-[0.28rem] py-[0.06rem] text-[0.54rem] uppercase tracking-[0.08em]"
          :class="healthLevelClasses(item.level)"
        >
          {{ item.level }}
        </span>
      </div>
    </div>
    <div v-else class="text-[0.72rem] text-white/45">No ARR health warnings.</div>
  </article>
</template>

<script setup lang="ts">
import type { HealthIssue } from "@/types/media";

defineProps<{ items: HealthIssue[] }>();

const healthSourceClasses = (source: string) =>
  source === "sonarr"
    ? "border-[#7fa1c3]/35 text-[#7fa1c3]"
    : "border-[#a3c4e8]/35 text-[#a3c4e8]";

const healthLevelClasses = (level: string) => {
  if (level === "warning") {
    return "border-[#f2cf8d]/35 text-[#f2cf8d]";
  }

  if (level === "error") {
    return "border-[#f2b4b4]/35 text-[#f2b4b4]";
  }

  return "border-[#9eb1c5]/35 text-[#9eb1c5]";
};
</script>
