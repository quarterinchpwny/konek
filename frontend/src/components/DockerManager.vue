<template>
  <div class="h-full flex flex-col bg-gray-900 text-gray-200 font-mono p-4 overflow-hidden">
    <!-- No host -->
    <div v-if="!hostId" class="flex items-center justify-center flex-1">
      <p class="text-gray-500">Please select a host to view Docker containers.</p>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="flex items-center justify-center flex-1">
      <p class="text-gray-500">Loading Docker info...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!dockerInfo || dockerInfo.containers.length === 0" class="flex items-center justify-center flex-1">
      <p class="text-gray-500">No Docker containers found or Docker is not running.</p>
    </div>

    <!-- Main -->
    <div v-else class="flex flex-col flex-1 overflow-hidden">
      <!-- Toolbar -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input v-model="search" placeholder="Search containers..."
          class="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm w-64 focus:outline-none focus:ring focus:ring-blue-500/30" />

        <label class="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" v-model="showOnlyRunning" class="accent-green-500" />
          Running only
        </label>
      </div>

      <!-- Scroll -->
      <div class="flex-1 overflow-y-auto pr-1">
        <div v-for="(containers, group) in groupedContainers" :key="group" class="mb-6">
          <!-- Group header -->
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm uppercase tracking-wide text-gray-400">
              {{ group }}
            </h3>
            <div class="flex items-center gap-4 text-xs text-gray-400" v-if="collapsed[group] && stackTotals[group]">
              <span>CPU: {{ stackTotals[group].cpu.toFixed(1) }}%</span>
              <span>
                RAM:
                {{ formatBytes(stackTotals[group].memUsed) }}
                /
                {{ formatBytes(stackTotals[group].memLimit) }}
              </span>
            </div>
            <button class="text-xs text-blue-400 hover:text-blue-300" @click="collapsed[group] = !collapsed[group]">
              {{ collapsed[group] ? 'Expand' : 'Collapse' }}
            </button>

          </div>

          <!-- Cards -->
          <div v-show="!collapsed[group]" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div v-for="container in containers" :key="container.id"
              class="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <Icon :icon="getIconCached(container)" class="w-6 h-6" />
                    <span class="font-bold text-white truncate">
                      {{ container.name }}
                    </span>
                  </div>

                  <span class="px-2 py-1 text-xs rounded-full" :class="getStatusClass(container.status)">
                    {{ container.status }}
                  </span>
                </div>

                <p class="text-xs text-gray-400">Image: {{ container.image }}</p>

                <p v-if="container.compose" class="text-xs text-blue-400">
                  {{ container.compose.project }} · {{ container.compose.service }}
                </p>

                <div class="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Health: {{ container.health }}</span>
                  <span>Restart: {{ container.restartPolicy }}</span>
                </div>

                <!-- CPU -->
                <div v-if="container.stats" class="mt-3">
                  <div class="flex justify-between text-xs mb-1">
                    <span>CPU</span>
                    <span>{{ container.stats.cpu.toFixed(1) }}%</span>
                  </div>
                  <div class="h-1.5 bg-gray-700 rounded">
                    <div class="h-1.5 bg-blue-500 rounded transition-all"
                      :style="{ width: container.stats.cpu + '%' }" />
                  </div>
                </div>

                <!-- Memory -->
                <div v-if="container.stats" class="mt-2">
                  <div class="flex justify-between text-xs mb-1">
                    <span>RAM</span>
                    <span>
                      {{ formatBytes(container.stats.memUsed) }} /
                      {{ formatBytes(container.stats.memLimit) }}
                    </span>
                  </div>
                  <div class="h-1.5 bg-gray-700 rounded">
                    <div class="h-1.5 bg-green-500 rounded transition-all"
                      :style="{ width: memPercent(container) + '%' }" />
                  </div>
                </div>
              </div>

              <!-- Controls -->
              <div class="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button @click="handleAction(container.id, 'start')" :disabled="container.status.startsWith('Up')"
                    class="p-2 bg-green-500 hover:bg-green-600 rounded disabled:bg-gray-600">
                    <PlayIcon class="w-4 h-4" />
                  </button>

                  <button @click="handleAction(container.id, 'stop')" :disabled="!container.status.startsWith('Up')"
                    class="p-2 bg-red-500 hover:bg-red-600 rounded disabled:bg-gray-600">
                    <StopIcon class="w-4 h-4" />
                  </button>

                  <button @click="handleAction(container.id, 'restart')"
                    class="p-2 bg-blue-500 hover:bg-blue-600 rounded">
                    <ArrowPathIcon class="w-4 h-4" />
                  </button>
                </div>

                <button @click="openLogs(container.id)" class="p-2 bg-gray-600 hover:bg-gray-500 rounded">
                  <CommandLineIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DockerLogsViewer :show="showLogsModal" :container-id="selectedContainerId" @close="showLogsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSshStore } from '../stores/SSHStore';
import { useDockerStore } from '../stores/dockerStore';
import DockerLogsViewer from './DockerLogsViewer.vue';
import { PlayIcon, StopIcon, ArrowPathIcon, CommandLineIcon } from '@heroicons/vue/24/solid';
import { Icon } from '@iconify/vue';

const props = defineProps<{ hostId?: number }>();

const sshStore = useSshStore();
const dockerStore = useDockerStore();

const stats = ref<any>(null);
const isLoading = ref(false);

const showLogsModal = ref(false);
const selectedContainerId = ref<string | null>(null);

const search = ref('');
const showOnlyRunning = ref(false);
const collapsed = ref<Record<string, boolean>>({});

let intervalId: number | null = null;
const iconCache = ref<Record<string, string>>({});

const dockerInfo = computed(() => stats.value?.docker);

const groupedContainers = computed(() => {
  const q = search.value.toLowerCase();

  const filtered = (dockerInfo.value?.containers || []).filter((c: any) => {
    if (showOnlyRunning.value && !c.status.startsWith('Up')) return false;

    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      c.image.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q) ||
      c.compose?.project?.toLowerCase().includes(q) ||
      c.compose?.service?.toLowerCase().includes(q)
    );
  });

  const groups: Record<string, any[]> = {};

  for (const c of filtered) {
    const key = c.group || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  return groups;
});
const stackTotals = computed(() => {
  const totals: Record<string, any> = {};

  for (const c of dockerInfo.value?.containers || []) {
    const g = c.group;
    if (!g || !c.stats) continue;

    if (!totals[g]) {
      totals[g] = { cpu: 0, memUsed: 0, memLimit: 0 };
    }

    totals[g].cpu += c.stats.cpu;
    totals[g].memUsed += c.stats.memUsed;
    totals[g].memLimit += c.stats.memLimit;
  }

  return totals;
});

const fetchStats = async () => {
  if (!props.hostId) return;

  isLoading.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`);
    stats.value = res.ok ? await res.json() : null;
  } catch (e) {
    stats.value = null;
  } finally {
    isLoading.value = false;
  }
};

const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
  await dockerStore.performAction(id, action);
  fetchStats();
};

const openLogs = (id: string) => {
  selectedContainerId.value = id;
  showLogsModal.value = true;
};

const getStatusClass = (status: string) => {
  if (status.startsWith('Up')) return 'bg-green-500/20 text-green-400';
  if (status.startsWith('Exited')) return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-400';
};

const formatBytes = (b: number) => {
  if (!b) return '0B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(1)}${u[i]}`;
};

const memPercent = (c: any) => {
  if (!c.stats?.memUsed || !c.stats?.memLimit) return 0;
  return Math.min(100, (c.stats.memUsed / c.stats.memLimit) * 100);
};

const getIcon = (containerData: Record<string, any>) => {
  if (!containerData) return 'mdi:docker';

  const containerName =
    containerData.labels?.['com.docker.compose.project'] ||
    containerData.image ||
    'docker';

  const baseName =
    containerName
      .split(':')[0]
      .split('/')
      .pop()
      ?.toLowerCase() || 'docker';

  return `simple-icons:${baseName}`;
};

const getIconCached = (container: Record<string, any>) => {
  const id = container.id;
  if (iconCache.value[id]) return iconCache.value[id];

  const icon = getIcon(container);
  iconCache.value[id] = icon;
  return icon;
};

onMounted(() => {
  if (!props.hostId) return;

  sshStore.connect(props.hostId).then(() => {
    fetchStats();
    intervalId = setInterval(fetchStats, 5000);
  });
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(() => props.hostId, (newHostId) => {
  if (intervalId) clearInterval(intervalId);

  if (!newHostId) return;

  sshStore.connect(newHostId).then(() => {
    fetchStats();
    intervalId = setInterval(fetchStats, 5000);
  });
});
</script>
