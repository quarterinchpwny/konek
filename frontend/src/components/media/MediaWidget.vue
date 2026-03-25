<template>
  <article class="min-h-[var(--media-widget-min-height)] rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-3 backdrop-blur-[8px] transition-colors duration-200 hover:border-white/10">
    <header class="mb-3 flex items-start justify-between gap-2">
      <div class="flex items-start gap-2">
        <Icon :icon="icon" class="mt-[0.1rem] text-[20px]" :class="accentClass" />
        <div>
          <h3 class="text-[0.82rem] text-white/90">{{ title }}</h3>
          <span
            class="mt-[0.2rem] inline-flex items-center rounded-full border px-[0.38rem] py-[0.08rem] text-[0.62rem] capitalize tracking-[0.04em]"
            :class="statusClasses"
          >
            {{ statusText }}
          </span>
          <span
            v-if="meta"
            class="mt-[0.22rem] block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] text-white/40"
          >
            {{ meta }}
          </span>
        </div>
      </div>
      <a
        v-if="href"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/8 bg-white/2 text-white/60 transition-all duration-200 hover:border-[#7fa1c3]/30 hover:bg-[#7fa1c3]/10 hover:text-[#7fa1c3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa1c3]/50"
        :aria-label="externalLabel"
      >
        <Icon icon="mdi:open-in-new" />
      </a>
    </header>

    <slot name="stats" />
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  title: string;
  icon: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  href?: string;
  externalLabel: string;
  accentClass?: string;
}>();

const statusClassMap: Record<string, string> = {
  online: "border-[#8bd5a8]/35 bg-[#8bd5a8]/8 text-[#8bd5a8]",
  offline: "border-[#f2b4b4]/35 bg-[#f2b4b4]/8 text-[#f2b4b4]",
  timeout: "border-[#f2b4b4]/35 bg-[#f2b4b4]/8 text-[#f2b4b4]",
  auth_error: "border-[#f2b4b4]/35 bg-[#f2b4b4]/8 text-[#f2b4b4]",
  degraded: "border-[#f2cf8d]/35 bg-[#f2cf8d]/8 text-[#f2cf8d]",
  checking: "border-[#9eb1c5]/35 bg-[#9eb1c5]/8 text-[#9eb1c5]",
  unknown: "border-white/14 bg-white/2 text-white/45",
  disabled: "border-white/14 bg-white/2 text-white/45",
};

const statusClasses = computed(
  () => statusClassMap[props.statusClass] ?? statusClassMap.unknown,
);
</script>
