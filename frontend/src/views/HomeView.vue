<template>
  <div class="page-container">
    <div class="grid grid-cols-2">
      <div class="terminal-view">
        <SshTerminal v-if="sessionId" :session-id="sessionId" />
      </div>
      <FileManager />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue"; // Add watch and onUnmounted
import SshTerminal from "../components/SshTerminal.vue";
import FileManager from "../components/FileManager.vue";
import { useSshStore } from "../stores/ssh";
import { type Host } from '../stores/hostStore'; // Import Host type

// Define props
const props = defineProps<{
  selectedHost: Host | null;
}>();

const sshStore = useSshStore();
const sessionId = ref<string | null>(null);
const pollingInterval = ref<NodeJS.Timeout | null>(null); // To manage stats polling

const handleConnect = async () => {
  if (!props.selectedHost) {
    console.warn("No host selected for connection.");
    return;
  }

  const { hostname, username, password, port, id } = props.selectedHost;

  try {
    // Connect via sshStore
    await sshStore.connect({
      host: hostname,
      username: username,
      password: password,
      port: port,
    });

    // Connect via backend API (for session ID)
    const connectResponse = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: hostname,
        username: username,
        password: password,
        port: port,
      }),
    });
    const connectData = await connectResponse.json();

    if (connectData.status === "success") {
      sessionId.value = connectData.sessionId;

      // Register for stats monitoring
      await fetch("http://localhost:3000/api/stats/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id, // Use the actual host ID from selectedHost
          host: hostname, // These might be redundant but safe for existing API
          username: username,
          password: password,
        }),
      });

      // Start polling for data
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
      }
      pollingInterval.value = setInterval(async () => {
        const res = await fetch(`http://localhost:3000/api/stats/${id}`); // Use actual host ID

        if (!res.ok) {
          console.error("Stats not ready", await res.text());
          return;
        }

        const stats = await res.json();
        console.log(`Host ${hostname} - CPU:`, stats.cpu, "%");
        console.log(`Host ${hostname} - RAM:`, stats.memory.percent, "%");
      }, 5000);
    }
  } catch (err) {
    console.error("Failed to connect:", err);
  }
};

const disconnectFromHost = async (hostId: number) => {
  // Disconnect SSH session
  if (sessionId.value) {
    await fetch("http://localhost:3000/api/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.value }),
    });
    sessionId.value = null;
    sshStore.isConnected = false;
  }

  // Stop stats monitoring
  await fetch("http://localhost:3000/api/stats/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: hostId }),
  });
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
  }
};

// Watch for changes in selectedHost
watch(() => props.selectedHost, async (newHost, oldHost) => {
  if (oldHost && oldHost.id) {
    await disconnectFromHost(oldHost.id);
  }
  if (newHost) {
    await handleConnect();
  }
}, { immediate: true }); // Run immediately on mount if a host is already selected

// Clean up on component unmount
onUnmounted(() => {
  if (props.selectedHost && props.selectedHost.id) {
    disconnectFromHost(props.selectedHost.id);
  }
});
</script>

<style scoped>
.terminal-view {
  height: 600px; /* Important: The terminal needs a defined height */
}
</style>
