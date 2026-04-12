<template>
  <Transition name="modal-fade">
    <div
      v-if="show"
      class="logs-overlay"
      @click.self="close"
    >
      <div class="logs-modal">
        <!-- Background layers -->
        <div class="logs-bg"></div>
        <div class="logs-noise"></div>

        <!-- Content -->
        <div class="logs-content">
          <!-- Header -->
          <div class="logs-header">
            <div class="header-left">
              <div class="header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </div>
              <div class="header-text">
                <h3 class="header-title">Live Container Logs</h3>
                <p class="header-subtitle">{{ containerId?.substring(0, 12) }}</p>
              </div>
            </div>
            <button @click="close" class="close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Logs viewer -->
          <div ref="logBox" class="logs-viewer">
            <pre class="logs-text">{{ logs || 'Waiting for logs...' }}</pre>
          </div>

          <!-- Footer -->
          <div class="logs-footer">
            <div class="footer-left">
              <div class="status-indicator">
                <div class="status-dot" :class="{ 'status-dot-live': connected }"></div>
                <span class="status-label">Status:</span>
                <span class="status-value" :class="{ 'status-live': connected, 'status-disconnected': !connected }">
                  {{ connected ? 'LIVE' : 'DISCONNECTED' }}
                </span>
              </div>
            </div>

            <div class="footer-right">
              <button @click="clearLogs" class="clear-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue';
import { useSshStore } from '../stores/SSHStore';
import {
  buildBackendWebSocketUrl,
  createAuthenticatedWebSocket,
} from '../services/api';

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

const wsUrl = computed(() => {
  return buildBackendWebSocketUrl({
    sessionId: sshStore.sessionId || "",
    dockerId: props.containerId || "",
  });
});

const connect = () => {
  if (!props.containerId || !sshStore.sessionId) return;

  disconnect();

  ws = createAuthenticatedWebSocket(wsUrl.value);

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

<style scoped>
@reference "../assets/css/main.css";

.logs-overlay {
  background: rgba(0, 0, 0, 0.85);
  @apply fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[8px];
}

.logs-modal {
  @apply relative h-[80vh] max-h-[800px] w-full max-w-[1200px] overflow-hidden rounded-[20px];
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.logs-bg {
  background: linear-gradient(135deg, #0f1419 0%, #0a0e12 100%);
  @apply absolute inset-0 z-0;
}

.logs-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  @apply absolute inset-0 z-[1];
}

.logs-content {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  @apply relative z-[2] flex h-full flex-col;
}

.logs-header {
  background: rgba(20, 25, 32, 0.8);
  @apply flex shrink-0 items-center justify-between border-b border-white/6 px-8 py-6 backdrop-blur-[12px];
}

.header-left {
  @apply flex items-center gap-4;
}

.header-icon {
  background: rgba(127, 161, 195, 0.15);
  @apply flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7fa1c3]/20 text-[#7fa1c3];
}

.header-text {
  @apply flex flex-col;
}

.header-title {
  @apply m-0 mb-1 text-lg font-bold tracking-[-0.02em] text-white;
}

.header-subtitle {
  font-family: 'JetBrains Mono', monospace;
  @apply m-0 text-xs font-semibold text-white/50;
}

.close-btn {
  background: transparent;
  @apply flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none text-white/50 transition-all duration-200;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  @apply text-white;
}

.logs-viewer {
  background: #0a0e12;
  font-family: 'JetBrains Mono', monospace;
  @apply flex-1 overflow-y-auto p-6;
}

.logs-viewer::-webkit-scrollbar {
  width: 10px;
}

.logs-viewer::-webkit-scrollbar-track {
  background: rgba(30, 35, 42, 0.4);
}

.logs-viewer::-webkit-scrollbar-thumb {
  background: rgba(127, 161, 195, 0.3);
  border-radius: 5px;
}

.logs-viewer::-webkit-scrollbar-thumb:hover {
  background: rgba(127, 161, 195, 0.5);
}

.logs-text {
  font-family: 'JetBrains Mono', monospace;
  @apply m-0 whitespace-pre-wrap break-words text-[0.8125rem] leading-[1.6] text-white/85;
}

.logs-footer {
  background: rgba(20, 25, 32, 0.8);
  @apply flex shrink-0 items-center justify-between border-t border-white/6 px-8 py-4 backdrop-blur-[12px];
}

.footer-left {
  @apply flex items-center;
}

.status-indicator {
  @apply flex items-center gap-[0.625rem] text-[0.8125rem];
}

.status-dot {
  background: #d68a8a;
  @apply h-2 w-2 shrink-0 rounded-full;
}

.status-dot-live {
  background: #8bc4a0;
  box-shadow: 0 0 10px rgba(139, 196, 160, 0.6);
  animation: pulse-live 2s ease-in-out infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-label {
  @apply font-semibold text-white/50;
}

.status-value {
  font-family: 'JetBrains Mono', monospace;
  @apply text-xs font-bold tracking-[0.05em];
}

.status-live {
  color: #8bc4a0;
}

.status-disconnected {
  color: #d68a8a;
}

.footer-right {
  @apply flex items-center gap-3;
}

.clear-btn {
  background: rgba(140, 140, 150, 0.15);
  font-family: inherit;
  @apply flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 px-4 py-2.5 text-[0.8125rem] font-semibold text-white/80 transition-all duration-200;
}

.clear-btn:hover {
  background: rgba(140, 140, 150, 0.25);
  @apply border-white/12 text-white;
}

.clear-btn svg {
  @apply shrink-0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .logs-modal,
.modal-fade-leave-active .logs-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .logs-modal,
.modal-fade-leave-to .logs-modal {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 768px) {
  .logs-modal {
    max-width: 100%;
    height: 90vh;
  }

  .logs-header,
  .logs-footer {
    padding: 1rem 1.25rem;
  }

  .logs-viewer {
    @apply p-4;
  }
}
</style>
