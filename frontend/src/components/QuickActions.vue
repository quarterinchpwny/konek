<template>
  <section class="quick-actions-card">
    <header class="qa-header">
      <h3 class="qa-title">Quick Actions</h3>
      <p class="qa-subtitle">Run common code-server controls on a target host</p>
    </header>

    <div class="qa-content">
      <div class="qa-field">
        <label for="host-select" class="qa-label">Target host</label>
        <select id="host-select" v-model="selectedHostId" class="qa-select" :disabled="isLoading">
          <option v-for="host in hosts" :key="host.id" :value="host.id">
            {{ host.alias }} ({{ host.hostname }})
          </option>
        </select>
      </div>

      <div class="qa-actions">
        <button
          class="qa-btn qa-btn-start"
          :disabled="isLoading || selectedHostId == null"
          @click="executeAction('code_on')"
        >
          Code ON
        </button>
        <button
          class="qa-btn qa-btn-stop"
          :disabled="isLoading || selectedHostId == null"
          @click="executeAction('code_off')"
        >
          Code OFF
        </button>
        <button
          class="qa-btn qa-btn-status"
          :disabled="isLoading || selectedHostId == null"
          @click="executeAction('code_status')"
        >
          Status
        </button>
      </div>

      <div v-if="isLoading" class="qa-loading">Executing command...</div>

      <div v-if="output" class="qa-output">
        <div class="qa-output-title">Command Output</div>
        <pre>{{ output }}</pre>
      </div>

      <div v-if="error" class="qa-error">{{ error }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const hostStore = useHostStore();
const hosts = ref<Host[]>([]);
const selectedHostId = ref<number | null>(null);
const isLoading = ref(false);
const output = ref<string | null>(null);
const error = ref<string | null>(null);

const commands: Record<"code_on" | "code_off" | "code_status", string> = {
  code_on: "systemctl enable --now code-server-scheduler.timer && systemctl start code-server@root",
  code_off: "systemctl disable --now code-server-scheduler.timer && systemctl stop code-server@root",
  code_status: "systemctl status code-server@root",
};

onMounted(async () => {
  await hostStore.fetchHosts();
  hosts.value = hostStore.hosts;

  const firstHost = hosts.value.find((host) => host.id != null);
  if (firstHost?.id != null) {
    selectedHostId.value = firstHost.id;
  }
});

async function executeAction(action: "code_on" | "code_off" | "code_status") {
  if (selectedHostId.value == null) {
    error.value = "Please select a host.";
    return;
  }

  isLoading.value = true;
  output.value = null;
  error.value = null;

  try {
    const response = await axios.post(`${API_URL}/terminal/execute`, {
      hostId: selectedHostId.value,
      command: commands[action],
    });

    if (response.data.status === "success") {
      output.value = response.data.output || response.data.error || "Command executed, but no output received.";
      return;
    }

    error.value = response.data.message || "An unknown error occurred.";
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || "Failed to execute command.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.quick-actions-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 21, 28, 0.8);
  padding: 0.9rem;
}

.qa-header {
  margin-bottom: 0.75rem;
}

.qa-title {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
}

.qa-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.48);
  line-height: 1.35;
}

.qa-content {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.qa-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.qa-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.62);
}

.qa-select {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.78rem;
  padding: 0.52rem 0.6rem;
}

.qa-select:focus {
  outline: none;
  border-color: rgba(127, 161, 195, 0.75);
  box-shadow: 0 0 0 2px rgba(127, 161, 195, 0.18);
}

.qa-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.qa-btn {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.5rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
  color: rgba(255, 255, 255, 0.92);
}

.qa-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.qa-btn-start {
  background: rgba(78, 184, 115, 0.2);
  border-color: rgba(78, 184, 115, 0.34);
}

.qa-btn-start:hover:not(:disabled) {
  background: rgba(78, 184, 115, 0.3);
}

.qa-btn-stop {
  background: rgba(225, 103, 103, 0.2);
  border-color: rgba(225, 103, 103, 0.34);
}

.qa-btn-stop:hover:not(:disabled) {
  background: rgba(225, 103, 103, 0.3);
}

.qa-btn-status {
  background: rgba(127, 161, 195, 0.2);
  border-color: rgba(127, 161, 195, 0.34);
}

.qa-btn-status:hover:not(:disabled) {
  background: rgba(127, 161, 195, 0.3);
}

.qa-loading {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.72);
}

.qa-output {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.34);
  padding: 0.6rem;
}

.qa-output-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.45rem;
}

pre {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.84);
}

.qa-error {
  border-radius: 8px;
  border: 1px solid rgba(225, 103, 103, 0.35);
  background: rgba(225, 103, 103, 0.12);
  padding: 0.55rem 0.6rem;
  font-size: 0.72rem;
  color: #ffadad;
}

@media (max-width: 1200px) {
  .qa-actions {
    grid-template-columns: 1fr;
  }
}
</style>
