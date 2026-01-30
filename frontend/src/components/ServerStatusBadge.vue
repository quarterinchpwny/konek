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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  border: 1px solid;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all 0.2s ease;
}

.status-online {
  background: rgba(139, 196, 160, 0.12);
  border-color: rgba(139, 196, 160, 0.25);
}

.status-offline {
  background: rgba(214, 138, 138, 0.12);
  border-color: rgba(214, 138, 138, 0.25);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-online .status-label {
  color: #8bc4a0;
}

.status-offline .status-label {
  color: #d68a8a;
}
</style>