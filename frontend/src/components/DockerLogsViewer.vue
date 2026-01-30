<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full h-full max-w-4xl flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 class="text-lg font-semibold text-gray-100">
          Live Logs — {{ containerId?.substring(0, 12) }}
        </h3>
        <button @click="close" class="text-gray-400 hover:text-white">&times;</button>
      </div>

      <!-- Logs -->
      <div ref="logBox" class="p-4 overflow-y-auto flex-grow bg-black">
        <pre class="text-xs text-gray-300 whitespace-pre-wrap font-mono">
{{ logs || 'Waiting for logs...' }}
        </pre>
      </div>

      <!-- Footer -->
      <div class="p-2 border-t border-gray-700 flex-shrink-0 flex items-center justify-between gap-4">
        <div class="text-xs text-gray-400">
          Status:
          <span :class="connected ? 'text-green-400' : 'text-red-400'">
            {{ connected ? 'LIVE' : 'DISCONNECTED' }}
          </span>
        </div>

        <button
          @click="clearLogs"
          class="px-3 py-1 rounded text-xs font-medium text-white bg-gray-700 hover:bg-gray-600"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue';
import { useSshStore } from '../stores/SSHStore';

const props = defineProps({
  show: Boolean,
  containerId: String,
});

const emit = defineEmits(['close']);

const sshStore = useSshStore();

const logs = ref('');
const connected = ref(false);
const logBox = ref<HTMLElement | null>(null);

let ws: WebSocket | null = null;

/* ------------------ Core ------------------ */
const wsUrl = computed(() => {
  const host = window.location.hostname;
  return  `ws://${window.location.hostname}:3000?sessionId=${sshStore.sessionId}&dockerId=${props.containerId}`;
});

const connect = () => {
  if (!props.containerId || !sshStore.sessionId) return;

  disconnect();

  ws = new WebSocket(wsUrl.value);

  ws.onopen = () => {
    connected.value = true;
  };

  ws.onmessage = (e) => {
    logs.value += e.data;

    nextTick(() => {
      if (logBox.value) {
        logBox.value.scrollTop = logBox.value.scrollHeight;
      }
    });
  };

  ws.onclose = () => {
    connected.value = false;
  };

  ws.onerror = () => {
    connected.value = false;
  };
};

const disconnect = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

const clearLogs = () => {
  logs.value = '';
};

const close = () => {
  disconnect();
  emit('close');
};

/* ------------------ Lifecycle ------------------ */
watch(
  () => [props.show, props.containerId, sshStore.sessionId],
  ([show, id, sid]) => {
    if (show && id && sid) {
      connect();
    } else {
      disconnect();
    }
  },
  { immediate: true }
);

onBeforeUnmount(disconnect);
</script>
