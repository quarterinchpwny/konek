<template>
  <div
    v-if="show"
    class="context-menu"
    :style="{ top: `${y}px`, left: `${x}px` }"
    @click.stop
  >
    <div
      v-for="item in items"
      :key="item.label"
      :class="['menu-item', { danger: item.danger, divider: item.divider }]"
      @click="handleAction(item)"
    >
      <component :is="item.icon" v-if="item.icon" class="w-4 h-4" />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

interface MenuItem {
  label: string;
  icon?: any;
  action: () => void;
  danger?: boolean;
  divider?: boolean;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits(['close']);

const handleAction = (item: MenuItem) => {
  item.action();
  emit('close');
};

const closeOnOutsideClick = () => {
  emit('close');
};

onMounted(() => {
  window.addEventListener('click', closeOnOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', closeOnOutsideClick);
});
</script>

<style scoped>
@reference "../assets/css/main.css";

.context-menu {
  @apply fixed z-[1000] min-w-[180px] rounded-lg border border-white/10 bg-[#1c2128] p-2 font-['Inter',sans-serif];
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.menu-item {
  @apply flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[0.8125rem] text-white/80 transition-all duration-150;
}

.menu-item:hover {
  @apply bg-white/5 text-white;
}

.menu-item.danger {
  @apply text-red-400;
}

.menu-item.danger:hover {
  background: rgba(248, 113, 113, 0.1);
}

.divider {
  @apply mt-1 border-t border-white/5 pt-2;
}
</style>
