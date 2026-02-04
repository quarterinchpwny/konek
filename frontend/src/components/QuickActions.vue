
<template>
  <div class="quick-actions-container">
    <div class="header">
      <h2>Quick Actions</h2>
    </div>
    <div class="actions-content">
      <div class="action-group">
        <label for="host-select">Target Host:</label>
        <select id="host-select" v-model="selectedHostId">
          <option v-for="host in hosts" :key="host.id" :value="host.id">
            {{ host.alias }} ({{ host.hostname }})
          </option>
        </select>
      </div>
      <div class="action-buttons">
        <button @click="executeAction('code_on')">Code ON</button>
        <button @click="executeAction('code_off')">Code OFF</button>
        <button @click="executeAction('code_status')">Code Status</button>
      </div>
    </div>
    <div v-if="isLoading" class="loading-overlay">
      <p>Executing...</p>
    </div>
    <div v-if="output" class="output-viewer">
      <h3>Command Output</h3>
      <pre>{{ output }}</pre>
    </div>
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHostStore, type Host } from '@/stores/hostStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const hostStore = useHostStore();
const hosts = ref<Host[]>([]);
const selectedHostId = ref<number | null>(null);
const isLoading = ref(false);
const output = ref<string | null>(null);
const error = ref<string | null>(null);

const commands: { [key: string]: string } = {
  code_on: 'systemctl enable --now code-server-scheduler.timer && systemctl start code-server@root',
  code_off: 'systemctl disable --now code-server-scheduler.timer && systemctl stop code-server@root',
  code_status: 'systemctl status code-server@root',
};

onMounted(async () => {
  await hostStore.fetchHosts();
  hosts.value = hostStore.hosts;
  if (hosts.value.length > 0) {
    selectedHostId.value = hosts.value[0].id ?? null;
  }
});

async function executeAction(action: 'code_on' | 'code_off' | 'code_status') {
  if (!selectedHostId.value) {
    error.value = 'Please select a host.';
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

    if (response.data.status === 'success') {
      output.value = response.data.output || response.data.error || 'Command executed, but no output received.';
    } else {
      error.value = response.data.message || 'An unknown error occurred.';
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to execute command.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.quick-actions-container {
  background-color: #f3f4f6;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
.actions-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.action-group {
  display: flex;
  flex-direction: column;
}
label {
  margin-bottom: 0.5rem;
  font-weight: 500;
}
select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #d1d5db;
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #4f46e5;
  color: white;
  cursor: pointer;
}
button:hover {
  background-color: #4338ca;
}
.loading-overlay {
  margin-top: 1rem;
}
.output-viewer {
  margin-top: 1rem;
  background-color: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
.error-message {
  margin-top: 1rem;
  color: #dc2626;
}
</style>
