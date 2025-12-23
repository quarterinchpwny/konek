<template>
  <div class="server-stats-widget p-4 bg-gray-800 rounded-lg shadow-lg text-white">
    <h3 class="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Server Vitals</h3>

    <div v-if="status === 'offline'" class="flex items-center justify-center h-full">
      <p class="text-red-500 text-lg">OFFLINE</p>
    </div>

    <div v-else-if="status === 'auth_failed'" class="flex items-center justify-center h-full">
      <p class="text-yellow-500 text-lg">Authentication Failed</p>
    </div>

    <div v-else-if="stats" class="space-y-5">
      <!-- System Info -->
      <div>
        <h4 class="font-semibold text-gray-400">SYSTEM</h4>
        <p>{{ stats.system.hostname }} ({{ stats.system.os }})</p>
        <p>Uptime: {{ stats.system.uptime }}</p>
      </div>

      <!-- CPU Usage -->
      <div class="cpu-stat">
        <h4 class="font-semibold text-gray-400">CPU</h4>
        <div class="w-full bg-gray-700 rounded-full h-4">
          <div class="bg-blue-500 h-4 rounded-full" :style="{ width: stats.cpu.percent + '%' }"></div>
        </div>
        <div class="text-right text-sm">{{ stats.cpu.percent.toFixed(1) }}%</div>
      </div>

      <!-- Memory Usage -->
      <div class="memory-stat">
        <h4 class="font-semibold text-gray-400">MEMORY</h4>
        <div class="w-full bg-gray-700 rounded-full h-4">
          <div class="bg-green-500 h-4 rounded-full" :style="{ width: stats.memory.percent + '%' }"></div>
        </div>
        <div class="text-right text-sm">{{ stats.memory.percent.toFixed(1) }}%</div>
      </div>

      <!-- Disk Usage -->
      <div class="disk-stat">
        <h4 class="font-semibold text-gray-400">DISK</h4>
        <div v-for="disk in stats.disk" :key="disk.mount" class="mt-2">
          <p class="text-sm">{{ disk.mount }}</p>
          <div class="w-full bg-gray-700 rounded-full h-3">
            <div class="bg-yellow-500 h-3 rounded-full" :style="{ width: disk.percent }"></div>
          </div>
          <div class="text-right text-xs">{{ disk.used }} / {{ disk.available }} ({{ disk.percent }})</div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-full">
      <p class="text-gray-400">Loading stats...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  hostId: number;
}>();

const stats = ref<any>(null);
const status = ref<string>('loading');
let intervalId: NodeJS.Timeout | null = null;

const fetchStats = async () => {
  if (!props.hostId) return;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`);
    if (!res.ok) {
      const errorData = await res.json();
      status.value = errorData.status || 'offline';
      stats.value = null;
      return;
    }
    const data = await res.json();
    stats.value = data;
    status.value = 'online';
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    status.value = 'offline';
    stats.value = null;
  }
};

onMounted(() => {
  fetchStats();
  intervalId = setInterval(fetchStats, 5000); // Fetch every 5 seconds
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

watch(() => props.hostId, () => {
  stats.value = null; // Reset on host change
  status.value = 'loading';
  if (intervalId) clearInterval(intervalId);
  fetchStats();
  intervalId = setInterval(fetchStats, 5000);
});
</script>

<style scoped>
.server-stats-widget {
  min-height: 300px;
}
</style>
