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
            v-if="activeTab !== 'overview'"
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
            @open-tab="activeTab = $event"
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
      <aside
        v-if="activeTab !== 'overview'"
        class="sidebar-desktop"
        aria-label="Server stats"
      >
        <ServerStats
          v-if="hostStore.selectedHost?.id != null && sessionId"
          :host-id="hostStore.selectedHost.id"
        />
        <QuickActions class="mt-4" />
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
            v-if="
              activeTab !== 'overview' &&
              hostStore.selectedHost?.id != null &&
              sessionId
            "
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

watch(activeTab, (tab) => {
  if (tab === "overview") {
    showMobileStats.value = false;
  }
});
</script>

<style scoped>
@reference "../assets/css/main.css";

.main-page {
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.main-bg {
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  @apply absolute inset-0 z-0;
}

.main-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  @apply absolute inset-0 z-[1];
}

.main-header {
  background: rgba(20, 25, 32, 0.85);
  @apply relative z-10 flex shrink-0 flex-col gap-[0.375rem] border-b border-white/6 px-4 py-2 backdrop-blur-[12px];
}

@media (min-width: 768px) {
  .main-header {
    @apply h-14 flex-row items-center gap-4 px-6 py-0;
  }
}

.header-top {
  @apply flex items-center justify-between gap-2;
}

@media (min-width: 768px) {
  .header-top {
    @apply flex-none justify-start;
  }
}

.breadcrumb {
  @apply flex min-w-0 items-center gap-2 text-[0.8125rem];
}

.breadcrumb-item {
  @apply whitespace-nowrap font-medium text-white/40;
}

.breadcrumb-separator {
  @apply shrink-0 text-white/20;
}

.breadcrumb-current {
  @apply max-w-[40vw] overflow-hidden text-ellipsis whitespace-nowrap font-semibold tracking-[-0.01em] text-white/90;
}

@media (min-width: 768px) {
  .breadcrumb-current {
    max-width: none;
  }
}

.stats-toggle {
  background: rgba(127, 161, 195, 0.1);
  @apply flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#7fa1c3]/20 text-[#7fa1c3] transition-colors duration-200;
}

.stats-toggle:hover {
  background: rgba(127, 161, 195, 0.18);
}

.tabs-row {
  @apply flex items-center justify-start gap-2 overflow-x-auto overflow-y-hidden pr-[0.125rem];
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs-row::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .tabs-row {
    @apply ml-auto flex-[1_1_auto] justify-end overflow-visible;
  }

  .tabs-container {
    @apply ml-auto;
  }
}

.tabs-meta {
  @apply flex flex-none items-center gap-2;
}

.tabs-container {
  background: rgba(30, 35, 42, 0.4);
  @apply flex min-w-max items-center gap-[0.125rem] rounded-[10px] border border-white/6 p-1;
}

.tab {
  @apply relative flex min-h-9 touch-manipulation items-center gap-[0.375rem] whitespace-nowrap rounded-lg border-none bg-transparent px-3 py-2 text-[0.8125rem] font-semibold tracking-[-0.01em] text-white/50 transition-all duration-200;
  font-family: inherit;
}

@media (min-width: 640px) {
  .tab {
    @apply px-4 py-2.5;
  }
}

.tab:hover {
  background: rgba(255, 255, 255, 0.03);
  @apply text-white/80;
}

.tab-active {
  background: rgba(127, 161, 195, 0.12);
  @apply text-[#7fa1c3];
}

.tab-active:hover {
  background: rgba(127, 161, 195, 0.15);
  @apply text-[#7fa1c3];
}

.tab-indicator {
  background: linear-gradient(to right, transparent, #7fa1c3, transparent);
  animation: tab-indicator-slide 0.3s ease;
  @apply absolute bottom-[-1px] left-2 right-2 h-0.5 rounded-[1px];
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
  @apply relative z-[2] flex min-h-0 flex-[1_1_0] overflow-hidden;
}

.content-main {
  @apply relative flex min-h-0 min-w-0 flex-[1_1_0] flex-col overflow-hidden;
}

.panel-full {
  @apply relative z-[1] min-h-0 flex-[1_1_0] overflow-auto;
}

.panel-empty {
  @apply flex h-full flex-col items-center justify-center gap-3 text-sm text-white/30;
}

.panel-empty-icon {
  @apply opacity-40;
}

.sidebar-desktop {
  @apply hidden;
}

@media (min-width: 1024px) {
  .sidebar-desktop {
    background: rgba(0, 0, 0, 0.2);
    @apply block w-[260px] flex-[0_0_260px] overflow-x-hidden overflow-y-auto border-l border-white/5 pb-4;
  }
}

.stats-backdrop {
  background: rgba(0, 0, 0, 0.5);
  @apply fixed inset-0 z-40;
}

.stats-drawer {
  background: rgba(14, 18, 24, 0.98);
  @apply fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-white/8;
}

.stats-drawer-handle {
  @apply flex shrink-0 cursor-pointer justify-center p-3;
}

.handle-bar {
  background: rgba(255, 255, 255, 0.2);
  @apply h-1 w-10 rounded-[2px];
}

.stats-drawer-content {
  @apply flex-1 overflow-y-auto px-4 pb-6;
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
