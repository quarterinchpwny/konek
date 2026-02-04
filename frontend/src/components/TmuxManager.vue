<template>
  <div class="tmux-manager">
    <!-- Background layers -->
    <div class="background-layer"></div>
    <div class="noise-overlay"></div>

    <!-- No host selected -->
    <div v-if="!localSelectedHostId" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">
          <Icon icon="mdi:console" class="icon" />
        </div>
        <p class="empty-text">Select a host to manage Tmux sessions</p>
        <div class="host-selector-grid">
          <button v-for="host in hosts" :key="host.id" @click="selectHost(host.id)" class="host-card">
            <div class="host-card-icon">
              <Icon icon="mdi:server" />
            </div>
            <div class="host-card-content">
              <h4 class="host-card-title">{{ host.alias }}</h4>
              <p class="host-card-subtitle">{{ host.hostname }}</p>
            </div>
            <Icon icon="mdi:chevron-right" class="host-card-arrow" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading tmux check -->
    <div v-else-if="isLoading && isTmuxInstalled === null" class="empty-state">
      <div class="empty-card">
        <div class="loader"></div>
        <p class="empty-text">Checking for tmux...</p>
      </div>
    </div>

    <!-- Tmux not installed -->
    <div v-else-if="isTmuxInstalled === false" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon error">
          <Icon icon="mdi:alert-circle" class="icon" />
        </div>
        <p class="empty-text error">Tmux is not installed on this host</p>
        <p class="empty-subtext">Please install tmux to continue</p>
        <button @click="localSelectedHostId = null" class="back-btn">
          <Icon icon="mdi:arrow-left" />
          Choose Different Host
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div v-else-if="isTmuxInstalled" class="main-content">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <button @click="localSelectedHostId = null" class="back-button">
            <Icon icon="mdi:arrow-left" />
          </button>
          <div class="header-title">
            <Icon icon="mdi:console" class="title-icon" />
            <div>
              <h1 class="title">Tmux Sessions</h1>
              <p class="subtitle">{{ selectedHostInfo?.alias }} ({{ selectedHostInfo?.hostname }})</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button @click="fetchSessions" :disabled="isLoading" class="refresh-btn">
            <Icon icon="mdi:refresh" :class="{ spinning: isLoading }" />
            Refresh
          </button>
          <button @click="showCreateModal = true" class="create-btn">
            <Icon icon="mdi:plus" />
            New Session
          </button>
        </div>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="alert-error">
        <Icon icon="mdi:alert-circle" class="alert-icon" />
        <span>{{ error }}</span>
      </div>

      <!-- Sessions grid -->
      <div v-if="sessions.length === 0 && !isLoading" class="empty-sessions">
        <div class="empty-sessions-icon">
          <Icon icon="mdi:console-line" />
        </div>
        <p class="empty-sessions-text">No active tmux sessions</p>
        <p class="empty-sessions-subtext">Create a new session to get started</p>
      </div>

      <div v-else class="sessions-grid">
        <div v-for="session in sessions" :key="session.name" class="session-card">
          <div class="session-header">
            <div class="session-info">
              <div class="session-icon-wrapper">
                <Icon icon="mdi:console" class="session-icon" />
              </div>
              <div class="session-details">
                <h3 class="session-name">{{ session.name }}</h3>
                <p class="session-meta">Active session</p>
              </div>
            </div>
            <div class="session-status">
              <div class="status-dot"></div>
              <span class="status-text">Running</span>
            </div>
          </div>

          <div class="session-actions">
            <button @click="handleInteract(session.name)" class="action-btn logs">
              <Icon icon="mdi:console" />
              Interact
            </button>
            <button @click="killTmuxSession(session.name)" class="action-btn kill">
              <Icon icon="mdi:close-circle" />
              Kill
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Create Session Modal -->
    <transition name="modal">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title">
              <Icon icon="mdi:plus-circle" class="modal-icon" />
              <h2>Create New Tmux Session</h2>
            </div>
            <button @click="closeModal" class="modal-close">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <Icon icon="mdi:tag" class="label-icon" />
                Session Name
                <span class="optional">(Optional)</span>
              </label>
              <input v-model="newSessionName" type="text" placeholder="my-session" class="form-input" />
              <p class="form-hint">Leave empty to auto-generate a name</p>
            </div>

            <div class="form-group">
              <label class="form-label required">
                <Icon icon="mdi:console-line" class="label-icon" />
                Command to Run
              </label>
              <input v-model="commandInput" type="text" placeholder="gemini-cli generate-image" class="form-input"
                @keyup.enter="createTmuxSession" />
              <p class="form-hint">The command that will run inside the tmux session</p>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="closeModal" class="modal-btn cancel">
              Cancel
            </button>
            <button @click="createTmuxSession" :disabled="isLoading || !commandInput" class="modal-btn create">
              <span v-if="isLoading" class="btn-spinner"></span>
              <Icon v-else icon="mdi:play" />
              Create & Run
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Interactive Terminal Modal -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="interactingSessionName" class="terminal-modal-overlay" @click.self="closeTerminal">
          <div class="terminal-modal-container">
            <div class="terminal-modal-header">
              <div class="terminal-modal-title">
                <Icon icon="mdi:console" class="terminal-modal-icon" />
                <h2>{{ interactingSessionName }}</h2>
              </div>
              <button @click="closeTerminal" class="terminal-modal-close">
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="terminal-modal-body">
              <SshTerminal v-if="sessionId && interactingSessionName" :key="`${sessionId}-${interactingSessionName}`"
                :session-id="sessionId" :tmux-session-name="interactingSessionName" :host-id="localSelectedHostId!" />
              <div v-else class="terminal-error">
                <Icon icon="mdi:alert-circle" class="error-icon" />
                <p>SSH Session ID not found. Cannot open terminal.</p>
                <button @click="reconnectSSH" class="reconnect-btn">
                  <Icon icon="mdi:refresh" />
                  Reconnect SSH
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useHostStore } from '@/stores/hostStore';
import { useTmuxStore } from '@/stores/tmuxStore';
import { useSshStore } from '@/stores/SSHStore';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import SshTerminal from './SshTerminal.vue';

const hostStore = useHostStore();
const tmuxStore = useTmuxStore();
const sshStore = useSshStore();

const { hosts } = storeToRefs(hostStore);
const { sessions, isLoading, error, isTmuxInstalled } = storeToRefs(tmuxStore);
const { sessionId } = storeToRefs(sshStore);

const localSelectedHostId = ref<number | null>(null);
const commandInput = ref('');
const newSessionName = ref('');
const showCreateModal = ref(false);
const interactingSessionName = ref<string | null>(null);

const selectedHostInfo = computed(() => {
  if (!localSelectedHostId.value) return null;
  return hosts.value.find(h => h.id === localSelectedHostId.value);
});

onMounted(async () => {
  if (hosts.value.length === 0) {
    await hostStore.fetchHosts();
  }
  tmuxStore.resetTmuxStatus();
});

const selectHost = async (hostId: number) => {
  localSelectedHostId.value = hostId;
};

watch(localSelectedHostId, async (newHostId) => {
  tmuxStore.resetTmuxStatus();
  if (sshStore.isConnected) {
    sshStore.disconnect();
  }
  if (newHostId) {
    await sshStore.connect(newHostId);
    if (sshStore.isConnected) {
      await tmuxStore.checkTmux(newHostId);
      if (isTmuxInstalled.value) {
        await tmuxStore.fetchSessions(newHostId);
      }
    }
  }
});

const fetchSessions = async () => {
  if (localSelectedHostId.value) {
    await tmuxStore.fetchSessions(localSelectedHostId.value);
  }
};

const createTmuxSession = async () => {
  if (!localSelectedHostId.value || !commandInput.value) {
    return;
  }
  try {
    await tmuxStore.createSession(localSelectedHostId.value, commandInput.value, newSessionName.value);
    commandInput.value = '';
    newSessionName.value = '';
    closeModal();
  } catch (err) {
    console.error('Failed to create session:', err);
  }
};

const handleInteract = (sessionName: string) => {
  if (!sessionId.value) {
    alert("SSH session is not established. Please re-select the host.");
    return;
  }
  interactingSessionName.value = sessionName;
};

const closeTerminal = () => {
  interactingSessionName.value = null;
};

const reconnectSSH = async () => {
  if (localSelectedHostId.value) {
    await sshStore.connect(localSelectedHostId.value);
  }
};

const killTmuxSession = async (sessionName: string) => {
  if (localSelectedHostId.value && confirm(`Are you sure you want to kill session "${sessionName}"?`)) {
    try {
      await tmuxStore.killSession(localSelectedHostId.value, sessionName);
      if (interactingSessionName.value === sessionName) {
        interactingSessionName.value = null;
      }
    } catch (err) {
      console.error('Failed to kill session:', err);
    }
  }
};

const closeModal = () => {
  showCreateModal.value = false;
  commandInput.value = '';
  newSessionName.value = '';
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.tmux-manager {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8e8;
}

/* Background layers */
.background-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at top, rgba(16, 24, 32, 0.9) 0%, rgba(8, 12, 16, 0.95) 100%),
    linear-gradient(135deg, #0a0e12 0%, #121820 50%, #0f1419 100%);
  z-index: 0;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Empty state */
.empty-state {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-card {
  text-align: center;
  padding: 3rem 2rem;
  max-width: 800px;
  width: 100%;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 35, 42, 0.5);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.empty-icon.error {
  background: rgba(214, 93, 93, 0.1);
  border-color: rgba(214, 93, 93, 0.2);
}

.empty-icon .icon {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.2);
}

.empty-icon.error .icon {
  color: #d68a8a;
}

.empty-text {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.01em;
}

.empty-text.error {
  color: #d68a8a;
}

.empty-subtext {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 2rem 0;
}

/* Host selector grid */
.host-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.host-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.host-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(127, 161, 195, 0.3);
  transform: translateY(-2px);
}

.host-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(127, 161, 195, 0.15);
  border-radius: 10px;
  font-size: 24px;
  color: #7fa1c3;
}

.host-card-content {
  flex: 1;
  min-width: 0;
}

.host-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-card-subtitle {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-card-arrow {
  flex-shrink: 0;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.3);
  transition: transform 0.2s ease;
}

.host-card:hover .host-card-arrow {
  transform: translateX(4px);
  color: #7fa1c3;
}

/* Back button */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(127, 161, 195, 0.15);
  border: 1px solid rgba(127, 161, 195, 0.3);
  border-radius: 10px;
  color: #7fa1c3;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1.5rem;
}

.back-btn:hover {
  background: rgba(127, 161, 195, 0.25);
  transform: translateY(-1px);
}

/* Loader */
.loader {
  width: 48px;
  height: 48px;
  margin: 0 auto 1.5rem;
  border: 3px solid rgba(100, 120, 140, 0.2);
  border-top-color: #6b8cae;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 0.8s linear infinite;
}

/* Main content */
.main-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow: hidden;
}

/* Header */
.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;
}

.back-button:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  color: #7fa1c3;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.title-icon {
  font-size: 32px;
  color: #7fa1c3;
  margin-top: 4px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  letter-spacing: -0.01em;
  font-family: 'JetBrains Mono', monospace;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.refresh-btn,
.create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.refresh-btn {
  background: rgba(20, 25, 32, 0.5);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-btn {
  background: rgba(127, 161, 195, 0.15);
  border-color: rgba(127, 161, 195, 0.3);
  color: #7fa1c3;
}

.create-btn:hover {
  background: rgba(127, 161, 195, 0.25);
  transform: translateY(-1px);
}

/* Alert */
.alert-error {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(214, 93, 93, 0.1);
  border: 1px solid rgba(214, 93, 93, 0.3);
  border-radius: 10px;
  color: #d68a8a;
  margin-bottom: 1.5rem;
}

.alert-icon {
  font-size: 20px;
  flex-shrink: 0;
}

/* Empty sessions */
.empty-sessions {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.empty-sessions-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 35, 42, 0.5);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 40px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 1.5rem;
}

.empty-sessions-text {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 0.5rem 0;
}

.empty-sessions-subtext {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

/* Sessions grid */
.sessions-grid {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
  margin-right: -0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
  align-content: start;
}

.sessions-grid::-webkit-scrollbar {
  width: 8px;
}

.sessions-grid::-webkit-scrollbar-track {
  background: transparent;
}

.sessions-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.sessions-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Session card */
.session-card {
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.session-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.session-card.active {
  border-color: rgba(127, 161, 195, 0.4);
  background: rgba(25, 30, 38, 0.8);
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: 1;
  min-width: 0;
}

.session-icon-wrapper {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(127, 161, 195, 0.15);
  border: 1px solid rgba(127, 161, 195, 0.2);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.session-card:hover .session-icon-wrapper {
  background: rgba(127, 161, 195, 0.25);
  border-color: rgba(127, 161, 195, 0.3);
}

.session-icon {
  font-size: 22px;
  color: #7fa1c3;
}

.session-details {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
}

.session-meta {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.session-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  background: rgba(107, 158, 125, 0.15);
  border: 1px solid rgba(107, 158, 125, 0.25);
  border-radius: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8bc4a0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

.status-text {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #8bc4a0;
  font-family: 'JetBrains Mono', monospace;
}

.session-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.action-btn.logs {
  background: rgba(127, 161, 195, 0.15);
  border-color: rgba(127, 161, 195, 0.25);
  color: #7fa1c3;
}

.action-btn.logs:hover {
  background: rgba(127, 161, 195, 0.25);
}

.action-btn.logs.active {
  background: rgba(127, 161, 195, 0.3);
  border-color: rgba(127, 161, 195, 0.4);
}

.action-btn.kill {
  background: rgba(214, 93, 93, 0.15);
  border-color: rgba(214, 93, 93, 0.25);
  color: #d68a8a;
}

.action-btn.kill:hover {
  background: rgba(214, 93, 93, 0.25);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-container {
  width: 100%;
  max-width: 540px;
  background: rgba(15, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 24px;
  color: #7fa1c3;
}

.modal-title h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(214, 93, 93, 0.15);
  border: 1px solid rgba(214, 93, 93, 0.25);
  border-radius: 8px;
  color: #d68a8a;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;
}

.modal-close:hover {
  background: rgba(214, 93, 93, 0.25);
}

.modal-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.form-label.required::after {
  content: '*';
  color: #d68a8a;
  margin-left: 0.25rem;
}

.label-icon {
  font-size: 16px;
  color: #7fa1c3;
}

.optional {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
}

.form-input {
  padding: 0.875rem 1rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #e8e8e8;
  font-size: 0.9375rem;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-input:focus {
  outline: none;
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(127, 161, 195, 0.4);
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
}

.form-hint {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.modal-btn.cancel {
  background: rgba(20, 25, 32, 0.5);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.modal-btn.cancel:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
}

.modal-btn.create {
  background: rgba(127, 161, 195, 0.2);
  border-color: rgba(127, 161, 195, 0.4);
  color: #7fa1c3;
}

.modal-btn.create:hover:not(:disabled) {
  background: rgba(127, 161, 195, 0.3);
  transform: translateY(-1px);
}

.modal-btn.create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(127, 161, 195, 0.3);
  border-top-color: #7fa1c3;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Terminal Modal Styles */
.terminal-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
}

.terminal-modal-container {
  width: 100%;
  max-width: 1400px;
  height: 85vh;
  background: rgba(10, 14, 18, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background: rgba(15, 20, 25, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.terminal-modal-title {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.terminal-modal-icon {
  font-size: 28px;
  color: #7fa1c3;
}

.terminal-modal-title h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
  font-family: 'JetBrains Mono', monospace;
}

.terminal-modal-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(214, 93, 93, 0.15);
  border: 1px solid rgba(214, 93, 93, 0.3);
  border-radius: 10px;
  color: #d68a8a;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 22px;
}

.terminal-modal-close:hover {
  background: rgba(214, 93, 93, 0.3);
  transform: scale(1.05);
}

.terminal-modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.terminal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 3rem;
  text-align: center;
}

.error-icon {
  font-size: 64px;
  color: #d68a8a;
  margin-bottom: 1.5rem;
}

.terminal-error p {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 2rem 0;
}

.reconnect-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.75rem;
  background: rgba(127, 161, 195, 0.2);
  border: 1px solid rgba(127, 161, 195, 0.4);
  border-radius: 10px;
  color: #7fa1c3;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reconnect-btn:hover {
  background: rgba(127, 161, 195, 0.3);
  transform: translateY(-2px);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container,
.modal-enter-from .terminal-modal-container,
.modal-leave-to .terminal-modal-container {
  transform: scale(0.95) translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem;
  }

  .sessions-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .refresh-btn,
  .create-btn {
    flex: 1;
  }

  .modal-overlay,
  .terminal-modal-overlay {
    padding: 1rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .host-selector-grid {
    grid-template-columns: 1fr;
  }

  .terminal-modal-container {
    height: 90vh;
  }
}
</style>