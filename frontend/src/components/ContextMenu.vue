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
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 180px;
  background: #1c2128;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  font-family: 'Inter', sans-serif;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.menu-item.danger {
  color: #f87171;
}

.menu-item.danger:hover {
  background: rgba(248, 113, 113, 0.1);
}

.divider {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 0.25rem;
  padding-top: 0.5rem;
}
</style>
