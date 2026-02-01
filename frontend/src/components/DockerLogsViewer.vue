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
  return `ws://${window.location.hostname}:3000?sessionId=${sshStore.sessionId}&dockerId=${props.containerId}`;
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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

/* Overlay */
.logs-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

/* Modal */
.logs-modal {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 80vh;
  max-height: 800px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

/* Background */
.logs-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0f1419 0%, #0a0e12 100%);
  z-index: 0;
}

.logs-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Content */
.logs-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Header */
.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: rgba(20, 25, 32, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(127, 161, 195, 0.15);
  border: 1px solid rgba(127, 161, 195, 0.2);
  border-radius: 12px;
  color: #7fa1c3;
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

/* Logs viewer */
.logs-viewer {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #0a0e12;
  font-family: 'JetBrains Mono', monospace;
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
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Footer */
.logs-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(20, 25, 32, 0.8);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.footer-left {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8125rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d68a8a;
  flex-shrink: 0;
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
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.status-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.status-live {
  color: #8bc4a0;
}

.status-disconnected {
  color: #d68a8a;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: rgba(140, 140, 150, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(140, 140, 150, 0.25);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.clear-btn svg {
  flex-shrink: 0;
}

/* Modal animations */
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

/* Responsive */
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
    padding: 1rem;
  }
}
</style>