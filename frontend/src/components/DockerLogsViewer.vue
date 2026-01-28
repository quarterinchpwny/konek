<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full h-full max-w-4xl flex flex-col">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 class="text-lg font-semibold text-gray-100">Logs for {{ containerId?.substring(0, 12) }}</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white">&times;</button>
      </div>
      <div class="p-4 overflow-y-auto flex-grow bg-black">
        <pre v-if="isLoading" class="text-gray-400">Loading logs...</pre>
        <pre v-else-if="error" class="text-red-400">Error: {{ error }}</pre>
        <pre v-else class="text-xs text-gray-300 whitespace-pre-wrap font-mono">{{ logs }}</pre>
      </div>
       <div class="p-2 border-t border-gray-700 flex-shrink-0 flex items-center justify-end gap-4">
        <label for="tail-lines" class="text-sm text-gray-400">Lines:</label>
        <select id="tail-lines" v-model.number="tail" class="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
          <option>100</option>
          <option>300</option>
          <option>500</option>
          <option>1000</option>
        </select>
        <button @click="fetchLogs" class="px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          Refresh
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDockerStore } from '../stores/dockerStore';

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  containerId: {
    type: String,
    default: null,
  },
});

defineEmits(['close']);

const dockerStore = useDockerStore();
const logs = ref("");
const isLoading = ref(false);
const error = ref<string | null>(null);
const tail = ref(300);

const fetchLogs = async () => {
  if (!props.containerId) return;
  isLoading.value = true;
  error.value = null;
  try {
    const data = await dockerStore.getLogs(props.containerId, tail.value);
    logs.value = data?.logs || "No logs found.";
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchLogs();
  }
});
</script>
