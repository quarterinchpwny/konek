<template>
  <div class="page-container">
    <!-- <div
      v-if="!sshStore.isConnected"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div
        class="bg-gray-800 p-8 rounded-lg w-96 border border-gray-700 text-white"
      >
        <h2 class="text-xl mb-4 font-bold text-white">SSH Connect</h2>
        <input
          v-model="host"
          placeholder="Host IP"
          class="w-full mb-3 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <input
          v-model="username"
          placeholder="Username"
          class="w-full mb-3 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="w-full mb-4 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <button
          @click="handleConnect"
          :disabled="sshStore.isLoading"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"
        >
          {{ sshStore.isLoading ? "Connecting..." : "Connect" }}
        </button>
      </div>
    </div> -->

    <div class="grid grid-cols-2">
      <div class="terminal-view">
        <SshTerminal v-if="sessionId" :session-id="sessionId" />
      </div>
      <FileManager />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import SshTerminal from "../components/SshTerminal.vue";
import FileManager from "../components/FileManager.vue";
import { useSshStore } from "../stores/ssh";

const sshStore = useSshStore();
const sessionId = ref<string | null>(null);
const host = ref("");
const username = ref("");
const password = ref("");

const handleConnect = async () => {
  //TODO: IMPLEMENT DB
  await sshStore.connect({
    host: host.value,
    username: username.value,
    password: password.value,
  });

  try {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: host.value,
        username: username.value,
        password: password.value,
      }),
    });
    await fetch("http://localhost:3000/api/stats/register", {
      method: "POST",
      body: JSON.stringify({
        id: "server-1",
        host: host.value,
        username: username.value,
        password: password.value,
      }),
    });

    // Example: Polling for data
    setInterval(async () => {
      const res = await fetch("http://localhost:3000/api/stats/server-1");

      if (!res.ok) {
        console.error("Stats not ready", await res.text());
        return;
      }

      const stats = await res.json();
      console.log("CPU:", stats.cpu, "%");
      console.log("RAM:", stats.memory.percent, "%");
    }, 5000);

    const data = await response.json();
    if (data.status === "success") {
      sessionId.value = data.sessionId;
    }
  } catch (err) {
    console.error("Failed to connect:", err);
  }
};

onMounted(() => {
  handleConnect();
});
</script>

<style scoped>
.terminal-view {
  height: 600px; /* Important: The terminal needs a defined height */
}
</style>
