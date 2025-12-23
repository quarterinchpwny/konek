<template>
  <div class="page-container">
    <div class="grid grid-cols-3 gap-4">
      <div class="terminal-view col-span-2">
        <SshTerminal v-if="sessionId" :session-id="sessionId" />
      </div>
      <FileManager />
      <div class="server-stats-view">
        <ServerStats
          v-if="props.selectedHost"
          :host-id="props.selectedHost.id"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import SshTerminal from "../components/SshTerminal.vue";
import ServerStats from "../components/ServerStats.vue";
import FileManager from "../components/FileManager.vue";
import { useSshStore } from "../stores/ssh";
import { type Host } from "../stores/hostStore";

const props = defineProps<{
  selectedHost: Host | null;
}>();

const sshStore = useSshStore();
const sessionId = ref<string | null>(null);

const handleConnect = async () => {
  if (!props.selectedHost) {
    console.warn("No host selected for connection.");
    return;
  }

  const { id } = props.selectedHost;

  try {
    await sshStore.connect(id);

    const connectResponse = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: id }),
      }
    );
    const connectData = await connectResponse.json();

    if (connectData.status === "success") {
      sessionId.value = connectData.sessionId;
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
  } catch (err) {
    console.error("Failed to connect:", err);
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
  () => props.selectedHost,
  async (newHost, oldHost) => {
    if (oldHost && oldHost.id) {
      await disconnectFromHost(oldHost.id);
    }
    if (newHost) {
      await handleConnect();
    }
  },
  { immediate: true }
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
