<template>
  <div
    v-if="status"
    class="status-badge"
    :class="containerClass"
  >
    <div class="status-dot" :class="dotClass"></div>
    <span class="status-label">{{ label }}</span>
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
  isOnline.value ? "status-online" : "status-offline"
);

const dotClass = computed(() =>
  isOnline.value ? "dot-online" : "dot-offline"
);
</script>

<style scoped>
@reference "../assets/css/main.css";

.status-badge {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  @apply inline-flex items-center gap-[0.625rem] rounded-[10px] border px-4 py-2.5 transition-all duration-200;
}

.status-online {
  background: rgba(139, 196, 160, 0.12);
  @apply border-[#8bc4a0]/25;
}

.status-offline {
  background: rgba(214, 138, 138, 0.12);
  @apply border-[#d68a8a]/25;
}

.status-dot {
  @apply h-2 w-2 shrink-0 rounded-full;
}

.dot-online {
  background: #8bc4a0;
  box-shadow: 0 0 10px rgba(139, 196, 160, 0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}

.dot-offline {
  background: #d68a8a;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.status-label {
  @apply text-[0.6875rem] font-bold uppercase tracking-[0.1em];
}

.status-online .status-label {
  @apply text-[#8bc4a0];
}

.status-offline .status-label {
  @apply text-[#d68a8a];
}
</style>
