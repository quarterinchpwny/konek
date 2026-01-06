<template>
  <div
    v-if="status"
    class="flex items-center gap-2 px-3 py-1 rounded-full border"
    :class="containerClass"
  >
    <div class="w-1.5 h-1.5 rounded-full" :class="dotClass"></div>

    <span
      class="text-[10px] font-bold uppercase tracking-widest"
      :class="textClass"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: string;
}>();

const isOnline = computed(() => props.status === "online");

const label = computed(() => (isOnline.value ? "Live" : "Offline"));

const containerClass = computed(() =>
  isOnline.value
    ? "bg-emerald-500/10 border-emerald-500/20"
    : "bg-red-500/10 border-red-500/20"
);

const dotClass = computed(() =>
  isOnline.value ? "bg-emerald-500 animate-pulse" : "bg-red-500"
);

const textClass = computed(() =>
  isOnline.value ? "text-emerald-400" : "text-red-400"
);
</script>
