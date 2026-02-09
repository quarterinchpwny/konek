<template>
  <main class="flex-1 flex flex-col relative min-w-0 overflow-hidden main-page">
    <!-- Background -->
    <div class="main-bg"></div>
    <div class="main-noise"></div>

    <!-- Top Header -->
    <header class="main-header">
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Connections</span>
        <ChevronRight :size="12" class="breadcrumb-separator" />
        <span class="breadcrumb-current">
          {{ hostStore.selectedHost?.alias || "No connection selected" }}
        </span>
      </div>

      <!-- Right side with tabs and status -->
      <div class="header-right">
        <!-- Tab Switcher -->
        <div class="tabs-container" v-if="serverStatus !== 'offline'">
          <button
            @click="activeTab = 'terminal'"
            :class="['tab', { 'tab-active': activeTab === 'terminal' }]"
          >
            <Terminal :size="14" />
            <span>Terminal</span>
            <div v-if="activeTab === 'terminal'" class="tab-indicator"></div>
          </button>
          <button
            @click="activeTab = 'files'"
            :class="['tab', { 'tab-active': activeTab === 'files' }]"
          >
            <Folder :size="14" />
            <span>Files</span>
            <div v-if="activeTab === 'files'" class="tab-indicator"></div>
          </button>
          <button
            @click="activeTab = 'docker'"
            :class="['tab', { 'tab-active': activeTab === 'docker' }]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 7h-9"></path>
              <path d="M14 17H5"></path>
              <circle cx="17" cy="17" r="3"></circle>
              <circle cx="7" cy="7" r="3"></circle>
            </svg>
            <span>Docker</span>
            <div v-if="activeTab === 'docker'" class="tab-indicator"></div>
          </button>
          <button
            @click="activeTab = 'processes'"
            :class="['tab', { 'tab-active': activeTab === 'processes' }]"
          >
            <Activity :size="14" />
            <span>Processes</span>
            <div v-if="activeTab === 'processes'" class="tab-indicator"></div>
          </button>
          <button
            @click="activeTab = 'media'"
            :class="['tab', { 'tab-active': activeTab === 'media' }]"
          >
            <Play :size="14" />
            <span>Media</span>
            <div v-if="activeTab === 'media'" class="tab-indicator"></div>
          </button>
        </div>

        <div class="header-divider"></div>

        <ServerStatusBadge :status="serverStatus" />
      </div>
    </header>
    
    <!-- Main content grid - this is the key fix -->
    <div class="grid grid-cols-5 flex-1 min-h-0 overflow-hidden">
      <div class="col-span-4 h-full overflow-hidden" v-show="activeTab === 'terminal'">
        <template v-if="sessionId">
          <SshTerminal :session-id="sessionId" :host-id="hostStore.selectedHost?.id" />
        </template>
      </div>
      <div class="col-span-4 h-full overflow-hidden" v-show="activeTab === 'files'">
        <FileManager :host-id="hostStore.selectedHost?.id" />
      </div>
      <div class="col-span-4 h-full overflow-hidden" v-show="activeTab === 'docker'">
        <DockerManager :host-id="hostStore.selectedHost?.id" />
      </div>
      <div class="col-span-4 h-full overflow-hidden" v-show="activeTab === 'processes'">
        <ProcessManager :host-id="hostStore.selectedHost?.id" />
      </div>
      <div class="col-span-4 h-full overflow-hidden" v-show="activeTab === 'media'">
        <MediaManager :host-id="hostStore.selectedHost?.id" />
      </div>
      <div class="col-span-1 h-full overflow-hidden">
        <ServerStats
          v-if="hostStore.selectedHost?.id != null && sessionId"
          :host-id="hostStore.selectedHost.id"
        />
        <QuickActions class="mt-4" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import axios from "axios";
import SshTerminal from "../components/SshTerminal.vue";
import ServerStats from "../components/ServerStats.vue";
import FileManager from "../components/FileManager.vue";
import DockerManager from "../components/DockerManager.vue";
import ProcessManager from "../components/ProcessManager.vue";
import MediaManager from "../components/MediaManager.vue";
import QuickActions from "../components/QuickActions.vue";

import { Terminal, ChevronRight, Folder, Activity, Play } from "lucide-vue-next";
import { useSshStore } from "../stores/SSHStore";
import { type Host, useHostStore } from "../stores/hostStore";
import ServerStatusBadge from "../components/ServerStatusBadge.vue";



const props = defineProps<{
  selectedHost: Host | null;
}>();

const sshStore = useSshStore();
const sessionId = ref<string | null>(null);
const hostStore = useHostStore();
const activeTab = ref("terminal");
const serverStatus = ref("offline");

const handleConnect = async () => {
  if (!hostStore.selectedHost) {
    console.warn("No host selected for connection.");
    return;
  }

  const { id } = hostStore.selectedHost;
  if (id == null) return;

  try {
    // If we have a sessionId in store, validate it first
    if (sshStore.sessionId) {
      const isValid = await sshStore.validateSession();
      if (isValid) {
        sessionId.value = sshStore.sessionId;
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        serverStatus.value = "online";
        return;
      }
    }

    // Try to find if there's an existing session for this host on the backend
    const sessionsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/terminal/sessions`, {
      params: { hostId: id }
    });
    
    if (sessionsRes.data.sessions && sessionsRes.data.sessions.length > 0) {
      const existingSessionId = sessionsRes.data.sessions[0].sessionId;
      sshStore.sessionId = existingSessionId;
      localStorage.setItem('sessionId', existingSessionId);
      sshStore.isConnected = true;
      sessionId.value = existingSessionId;
      
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      serverStatus.value = "online";
      return;
    }

    await sshStore.connect(id);
    if (sshStore.sessionId) {
      sessionId.value = sshStore.sessionId;
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      serverStatus.value = "online";
    }
  } catch (err) {
    console.error("Failed to connect:", err);
    serverStatus.value = "offline";
  }
};

const disconnectFromHost = async (hostId: number) => {
  if (sessionId.value) {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/terminal/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.value }),
      });
    } catch (e) {
      console.error("Failed to notify backend of disconnect", e);
    }
    sessionId.value = null;
    sshStore.disconnect();
  }

  try {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hostId }),
    });
  } catch (e) {
    console.error("Failed to stop stats", e);
  }
};

watch(
  () => hostStore.selectedHost?.id,
  async (newId, oldId) => {
    if (oldId && newId !== oldId) {
      await disconnectFromHost(oldId);
    }
    if (newId) {
      await handleConnect();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  // We don't disconnect on unmount anymore to persist state
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.main-page {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Background */
.main-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  z-index: 0;
}

.main-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Header */
.main-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 1.5rem;
  background: rgba(20, 25, 32, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8125rem;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  letter-spacing: -0.01em;
}

.breadcrumb-separator {
  color: rgba(255, 255, 255, 0.2);
}

.breadcrumb-current {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Header right */
.header-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Tabs */
.tabs-container {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(30, 35, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
}

.tab:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.03);
}

.tab-active {
  color: #7fa1c3;
  background: rgba(127, 161, 195, 0.12);
}

.tab-active:hover {
  color: #7fa1c3;
  background: rgba(127, 161, 195, 0.15);
}

.tab svg {
  flex-shrink: 0;
}

.tab span {
  flex-shrink: 0;
}

.tab-indicator {
  position: absolute;
  bottom: -1px;
  left: 0.5rem;
  right: 0.5rem;
  height: 2px;
  background: linear-gradient(to right, transparent, #7fa1c3, transparent);
  border-radius: 1px;
  animation: tab-indicator-slide 0.3s ease;
}

@keyframes tab-indicator-slide {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

/* Divider */
.header-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.06);
}
</style>