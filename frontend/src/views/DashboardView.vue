<template>
  <main class="flex-1 flex flex-col relative min-w-0 bg-[#0a0a0c]">
    <!-- Top Header -->
    <header
      class="h-16 border-b border-slate-800 bg-[#0c0c0e]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10"
    >
      <div class="flex items-center gap-4 text-sm">
        <span class="text-slate-500">Connections</span>
        <ChevronRight :size="14" class="text-slate-700" />
        <span class="text-white font-medium">{{
          hostStore.selectedHost?.alias || "No connection selected"
        }}</span>
      </div>

      <div class="flex items-center gap-4">
        <!-- View Switcher -->
        <div
          class="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800/50"
          v-if="serverStatus !== 'offline'"
        >
          <button
            @click="activeTab = 'terminal'"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all',
              activeTab === 'terminal'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            <Terminal :size="14" />
            Terminal
          </button>
          <button
            @click="activeTab = 'files'"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all',
              activeTab === 'files'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            <Folder :size="14" />
            Files
          </button>
          <button
            @click="activeTab = 'docker'"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all',
              activeTab === 'docker'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            
            Docker
          </button>
        </div>

        <div class="h-6 w-px bg-slate-800"></div>

        <ServerStatusBadge :status="serverStatus" />
      </div>
    </header>
    <div class="grid grid-cols-5">
      <div class="col-span-4" v-show="activeTab === 'terminal'">
        <template v-if="sessionId">
          <SshTerminal :session-id="sessionId" />
        </template>
      </div>
      <div class="col-span-4" v-show="activeTab === 'files'">
        <FileManager />
      </div>
      <div class="col-span-4" v-show="activeTab === 'docker'">
        <DockerManager :host-id="hostStore.selectedHost?.id" />
      </div>
      <ServerStats
        v-if="hostStore.selectedHost?.id != null && sessionId"
        :host-id="hostStore.selectedHost.id"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, defineComponent } from "vue";
import SshTerminal from "../components/SshTerminal.vue";
import ServerStats from "../components/ServerStats.vue";
import FileManager from "../components/FileManager.vue";
import DockerManager from "../components/DockerManager.vue";

import { Terminal, ChevronRight, Folder } from "lucide-vue-next";
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
    await sshStore.connect(id);

    const connectResponse = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: id }),
      },
    );
    const connectData = await connectResponse.json();

    if (connectData.status === "success") {
      sessionId.value = connectData.sessionId;
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
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.value }),
    });
    sessionId.value = null;
    sshStore.isConnected = false;
  }

  await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: hostId }),
  });
};

watch(
  () => hostStore.selectedHost,
  async (newHost, oldHost) => {
    if (oldHost && oldHost.id) {
      await disconnectFromHost(oldHost.id);
    }
    if (newHost) {
      await handleConnect();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (props.selectedHost && props.selectedHost.id) {
    disconnectFromHost(props.selectedHost.id);
  }
});
</script>

<style scoped>
.terminal-view {
  height: 600px;
}
</style>
