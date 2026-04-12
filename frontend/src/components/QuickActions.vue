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
@reference "../assets/css/main.css";

.quick-actions-card {
  background: rgba(16, 21, 28, 0.8);
  @apply rounded-xl border border-white/8 p-[0.9rem];
}

.qa-header {
  @apply mb-3;
}

.qa-title {
  @apply m-0 text-[0.76rem] font-bold uppercase tracking-[0.08em] text-white/58;
}

.qa-subtitle {
  @apply m-0 mt-[0.35rem] text-[0.72rem] leading-[1.35] text-white/48;
}

.qa-content {
  @apply flex flex-col gap-[0.65rem];
}

.qa-field {
  @apply flex flex-col gap-[0.4rem];
}

.qa-label {
  @apply text-[0.7rem] text-white/62;
}

.qa-select {
  background: rgba(255, 255, 255, 0.05);
  @apply w-full rounded-lg border border-white/12 px-[0.6rem] py-[0.52rem] text-[0.78rem] text-white/90;
}

.qa-select:focus {
  box-shadow: 0 0 0 2px rgba(127, 161, 195, 0.18);
  @apply border-[#7fa1c3]/75 outline-none;
}

.qa-actions {
  @apply grid grid-cols-3 gap-[0.45rem];
}

.qa-btn {
  @apply cursor-pointer rounded-lg border border-transparent px-[0.4rem] py-2 text-[0.72rem] font-semibold text-white/92 transition-all duration-150;
}

.qa-btn:disabled {
  @apply cursor-not-allowed opacity-50;
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
  @apply text-[0.72rem] text-white/72;
}

.qa-output {
  background: rgba(0, 0, 0, 0.34);
  @apply rounded-lg border border-white/10 p-[0.6rem];
}

.qa-output-title {
  @apply mb-[0.45rem] text-[0.68rem] uppercase tracking-[0.08em] text-white/50;
}

pre {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  @apply m-0 max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[0.72rem] text-white/84;
}

.qa-error {
  background: rgba(225, 103, 103, 0.12);
  @apply rounded-lg border border-[#e16767]/35 px-[0.6rem] py-[0.55rem] text-[0.72rem];
  color: #ffadad;
}

@media (max-width: 1200px) {
  .qa-actions {
    grid-template-columns: 1fr;
  }
}
</style>
