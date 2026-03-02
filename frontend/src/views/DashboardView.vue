<template>
  <main class="flex-1 flex flex-col relative min-w-0 overflow-hidden main-page">
    <div class="main-bg"></div>
    <div class="main-noise"></div>
    <header class="main-header blur-layer">
      <div class="header-top">
        <div class="breadcrumb">
          <span class="breadcrumb-item hidden sm:inline">Connections</span>
          <ChevronRight
            :size="12"
            class="breadcrumb-separator hidden sm:inline"
          />
          <span class="breadcrumb-current">
            {{ hostStore.selectedHost?.alias || "No connection selected" }}
          </span>
        </div>
      </div>
      <div class="tabs-row">
        <div class="tabs-container" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['tab', { 'tab-active': activeTab === tab.id }]"
            :aria-selected="activeTab === tab.id"
            role="tab"
          >
            <component :is="tab.icon" :size="14" v-if="tab.icon" />
            <svg
              v-else-if="tab.svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="tab.svg"
            ></svg>
            <span>{{ tab.label }}</span>
            <div v-if="activeTab === tab.id" class="tab-indicator"></div>
          </button>
        </div>
        <div class="tabs-meta">
          <ServerStatusBadge :status="serverStatus" />
          <button
            class="stats-toggle md:hidden"
            @click="showMobileStats = !showMobileStats"
            :aria-label="showMobileStats ? 'Hide stats' : 'Show stats'"
          >
            <BarChart2 :size="16" />
          </button>
        </div>
      </div>
    </header>
    <div class="content-wrapper">
      <div class="content-main" role="tabpanel">
        <div v-show="activeTab === 'overview'" class="panel-full">
          <OverviewPanel
            :host-id="hostStore.selectedHost?.id ?? null"
            :session-id="sessionId"
            :server-status="serverStatus"
          />
        </div>
        <div v-show="activeTab === 'terminal'" class="panel-full">
          <template v-if="sessionId">
            <SshTerminal
              :session-id="sessionId"
              :host-id="hostStore.selectedHost?.id"
            />
          </template>
          <div v-else class="panel-empty">
            <Terminal :size="32" class="panel-empty-icon" />
            <p>Connecting to terminal…</p>
          </div>
        </div>
        <div v-show="activeTab === 'files'" class="panel-full">
          <FileManager :host-id="hostStore.selectedHost?.id" />
        </div>
        <div v-show="activeTab === 'docker'" class="panel-full">
          <DockerManager :host-id="hostStore.selectedHost?.id" />
        </div>
        <div v-show="activeTab === 'processes'" class="panel-full">
          <ProcessManager :host-id="hostStore.selectedHost?.id" />
        </div>
        <div v-show="activeTab === 'media'" class="panel-full">
          <MediaManager :host-id="hostStore.selectedHost?.id" />
        </div>
      </div>
      <aside class="sidebar-desktop" aria-label="Server stats">
        <ServerStats
          v-if="activeTab !== 'overview' && hostStore.selectedHost?.id != null && sessionId"
          :host-id="hostStore.selectedHost.id"
        />
        <QuickActions v-if="activeTab !== 'overview'" class="mt-4" />
      </aside>
    </div>
    <Transition name="drawer">
      <div
        v-if="showMobileStats"
        class="stats-drawer lg:hidden"
        aria-label="Server stats"
      >
        <div class="stats-drawer-handle" @click="showMobileStats = false">
          <div class="handle-bar"></div>
        </div>
        <div class="stats-drawer-content">
          <ServerStats
            v-if="activeTab !== 'overview' && hostStore.selectedHost?.id != null && sessionId"
            :host-id="hostStore.selectedHost.id"
          />
          <QuickActions v-if="activeTab !== 'overview'" class="mt-4" />
        </div>
      </div>
    </Transition>
    <Transition name="fade">
      <div
        v-if="showMobileStats"
        class="stats-backdrop lg:hidden"
        @click="showMobileStats = false"
      />
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import axios from "axios";
import SshTerminal from "../components/SshTerminal.vue";
import ServerStats from "../components/ServerStats.vue";
import FileManager from "../components/FileManager.vue";
import DockerManager from "../components/DockerManager.vue";
import ProcessManager from "../components/ProcessManager.vue";
import MediaManager from "../components/MediaManager.vue";
import QuickActions from "../components/QuickActions.vue";
import OverviewPanel from "../components/dashboard/OverviewPanel.vue";

import {
  LayoutGrid,
  Terminal,
  ChevronRight,
  Folder,
  Activity,
  Play,
  BarChart2,
} from "lucide-vue-next";
import { useSshStore } from "../stores/SSHStore";
import { type Host, useHostStore } from "../stores/hostStore";
import ServerStatusBadge from "../components/ServerStatusBadge.vue";

const props = defineProps<{
  selectedHost: Host | null;
}>();

const sshStore = useSshStore();
const sessionId = ref<string | null>(null);
const hostStore = useHostStore();
const activeTab = ref("overview");
const serverStatus = ref("offline");
const showMobileStats = ref(false);
const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "files", label: "Files", icon: Folder },
  {
    id: "docker",
    label: "Docker",
    icon: null,
    svg: `<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>`,
  },
  { id: "processes", label: "Proc", icon: Activity },
  { id: "media", label: "Media", icon: Play },
];

const handleConnect = async () => {
  if (!hostStore.selectedHost) {
    console.warn("No host selected for connection.");
    return;
  }

  const { id } = hostStore.selectedHost;
  if (id == null) return;

  try {
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

    const sessionsRes = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/terminal/sessions`,
      { params: { hostId: id } },
    );

    if (sessionsRes.data.sessions?.length > 0) {
      const existingSessionId = sessionsRes.data.sessions[0].sessionId;
      sshStore.sessionId = existingSessionId;
      localStorage.setItem("sessionId", existingSessionId);
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
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap");

.main-page {
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

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

.main-header {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 1rem;
  background: rgba(20, 25, 32, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  backdrop-filter: blur(12px);
  gap: 0.375rem;
}

@media (min-width: 768px) {
  .main-header {
    padding: 0 1.5rem;
    flex-direction: row;
    align-items: center;
    height: 56px;
    gap: 1rem;
  }
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .header-top {
    flex: 0 0 auto;
    justify-content: flex-start;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  min-width: 0;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  white-space: nowrap;
}

.breadcrumb-separator {
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.breadcrumb-current {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40vw;
}

@media (min-width: 768px) {
  .breadcrumb-current {
    max-width: none;
  }
}

.stats-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(127, 161, 195, 0.1);
  border: 1px solid rgba(127, 161, 195, 0.2);
  color: #7fa1c3;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.stats-toggle:hover {
  background: rgba(127, 161, 195, 0.18);
}

.tabs-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding-right: 0.125rem;
  scrollbar-width: none;
}

.tabs-row::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .tabs-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex: 1 1 auto;
    margin-left: auto;
    overflow: visible;
  }

  .tabs-container {
    margin-left: auto;
  }
}

.tabs-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  background: rgba(30, 35, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  min-width: max-content;
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  padding: 0.5rem 0.75rem;
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
  white-space: nowrap;

  min-height: 36px;
  touch-action: manipulation;
}

@media (min-width: 640px) {
  .tab {
    padding: 0.625rem 1rem;
  }
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

.content-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.content-main {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-full {
  height: 100%;
  overflow: auto;
}

.panel-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.875rem;
}

.panel-empty-icon {
  opacity: 0.4;
}

.sidebar-desktop {
  display: none;
}

@media (min-width: 1024px) {
  .sidebar-desktop {
    display: block;
    flex: 0 0 260px;
    width: 260px;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 1rem;
  }
}

.stats-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

.stats-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(14, 18, 24, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px 16px 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.stats-drawer-handle {
  display: flex;
  justify-content: center;
  padding: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.handle-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
}

.stats-drawer-content {
  overflow-y: auto;
  flex: 1;
  padding: 0 1rem 1.5rem;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
