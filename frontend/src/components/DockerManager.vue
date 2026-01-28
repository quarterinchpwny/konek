<template>
  <div class="h-full flex flex-col bg-gray-900 text-gray-200 font-mono p-4">
    <div v-if="!hostId" class="flex items-center justify-center h-full">
      <p class="text-gray-500">Please select a host to view Docker containers.</p>
    </div>
    <div v-else-if="isLoading" class="flex items-center justify-center h-full">
      <p class="text-gray-500">Loading Docker info...</p>
    </div>
    <div v-else-if="!dockerInfo || dockerInfo.containers.length === 0" class="flex items-center justify-center h-full">
      <p class="text-gray-500">No Docker containers found or Docker is not running.</p>
    </div>
    <div v-else class="overflow-y-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="container in dockerInfo.containers" :key="container.id" class="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <img :src="getIcon(container.image)" alt="service icon" class="w-8 h-8">
                <span class="font-bold text-lg text-white">{{ container.name }}</span>
              </div>
              <span 
                class="px-2 py-1 text-xs rounded-full"
                :class="getStatusClass(container.status)"
              >
                {{ container.status }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mb-1">ID: {{ container.id.substring(0, 12) }}</p>
            <p class="text-xs text-gray-400">Image: {{ container.image }}</p>
          </div>
          <div class="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
            <div class="flex items-center gap-2">
               <button @click="handleAction(container.id, 'start')" :disabled="container.status.startsWith('Up')" class="p-2 bg-green-500 hover:bg-green-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed" title="Start">
                <PlayIcon class="w-4 h-4" />
              </button>
              <button @click="handleAction(container.id, 'stop')" :disabled="!container.status.startsWith('Up')" class="p-2 bg-red-500 hover:bg-red-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed" title="Stop">
                <StopIcon class="w-4 h-4" />
              </button>
               <button @click="handleAction(container.id, 'restart')" class="p-2 bg-blue-500 hover:bg-blue-600 rounded" title="Restart">
                <ArrowPathIcon class="w-4 h-4" />
              </button>
            </div>
            <button @click="openLogs(container.id)" class="p-2 bg-gray-600 hover:bg-gray-500 rounded" title="Logs">
              <CommandLineIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <DockerLogsViewer
      :show="showLogsModal"
      :container-id="selectedContainerId"
      @close="showLogsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSshStore } from '../stores/SSHStore';
import { useDockerStore } from '../stores/dockerStore';
import DockerLogsViewer from './DockerLogsViewer.vue';
import { PlayIcon, StopIcon, ArrowPathIcon, CommandLineIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{ hostId?: number }>();

const sshStore = useSshStore();
const dockerStore = useDockerStore();

const stats = ref<any>(null);
const isLoading = ref(false);
const showLogsModal = ref(false);
const selectedContainerId = ref<string | null>(null);
let intervalId: number | null = null;

const dockerInfo = computed(() => stats.value?.docker);

const fetchStats = async () => {
  if (!props.hostId) {
    stats.value = null;
    return;
  }
  isLoading.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`);
    if (res.ok) {
      stats.value = await res.json();
    } else {
      stats.value = null;
    }
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    stats.value = null;
  } finally {
    isLoading.value = false;
  }
};

const handleAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
  try {
    await dockerStore.performAction(containerId, action);
    // Refresh stats after action
    fetchStats();
  } catch (error) {
    console.error(`Failed to ${action} container:`, error);
    // Optionally show an error to the user
  }
};

const openLogs = (containerId: string) => {
  selectedContainerId.value = containerId;
  showLogsModal.value = true;
};

const getStatusClass = (status: string) => {
  if (status.startsWith('Up')) return 'bg-green-500/20 text-green-400';
  if (status.startsWith('Exited')) return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-400';
};

const getIcon = (imageName: string) => {
    //TODO: DOCKER SERVICE ICON FETCHER LOGIC
  // const name = imageName.split(':')[0].split('/_').pop()?.toLowerCase() || 'docker';
  return ``;
 
};


onMounted(() => {
  if (props.hostId) {
    sshStore.connect(props.hostId).then(() => {
      fetchStats();
      intervalId = setInterval(fetchStats, 5000);
    });
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(() => props.hostId, (newHostId) => {
  if (intervalId) clearInterval(intervalId);
  if (newHostId) {
    sshStore.connect(newHostId).then(() => {
      fetchStats();
      intervalId = setInterval(fetchStats, 5000);
    });
  }
});

</script>
