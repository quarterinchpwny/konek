<template>
  <div class="host-manager p-4 bg-gray-800 text-white rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold mb-4 text-center">Manage SSH Hosts</h2>

    <!-- Host Form -->
    <form
      @submit.prevent="saveHost"
      class="mb-8 p-6 bg-gray-700 rounded-md shadow-inner"
    >
      <h3 class="text-xl font-semibold mb-4">
        {{ editingHost ? "Edit Host" : "Add New Host" }}
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="alias" class="block text-sm font-medium text-gray-300"
            >Alias:</label
          >
          <input
            type="text"
            id="alias"
            v-model="form.alias"
            required
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label for="hostname" class="block text-sm font-medium text-gray-300"
            >Hostname/IP:</label
          >
          <input
            type="text"
            id="hostname"
            v-model="form.hostname"
            required
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label for="port" class="block text-sm font-medium text-gray-300"
            >Port:</label
          >
          <input
            type="number"
            id="port"
            v-model="form.port"
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label for="username" class="block text-sm font-medium text-gray-300"
            >Username:</label
          >
          <input
            type="text"
            id="username"
            v-model="form.username"
            required
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div class="md:col-span-2">
          <label for="macAddress" class="block text-sm font-medium text-gray-300"
            >MAC Address (optional, for WOL):</label
          >
          <input
            type="text"
            id="macAddress"
            v-model="form.macAddress"
            placeholder="XX:XX:XX:XX:XX:XX"
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div class="md:col-span-2">
          <label for="password" class="block text-sm font-medium text-gray-300"
            >Password (optional):</label
          >
          <input
            type="password"
            id="password"
            v-model="form.password"
            class="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-6">
        <button
          type="submit"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          {{ editingHost ? "Update Host" : "Add Host" }}
        </button>
        <button
          v-if="editingHost"
          @click="cancelEdit"
          type="button"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>

    <!-- Error Display -->
    <div
      v-if="hostStore.error"
      class="bg-red-900 text-white p-3 rounded-md mb-4"
    >
      Error: {{ hostStore.error }}
    </div>

    <!-- Host List -->
    <div class="host-list">
      <h3 class="text-xl font-semibold mb-4">Your Configured Hosts</h3>
      <div v-if="hostStore.isLoading" class="text-center text-gray-400">
        Loading hosts...
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="host in hostStore.hosts"
          :key="host.id"
          class="flex items-center justify-between p-4 bg-gray-700 rounded-md shadow"
        >
          <div>
            <div class="font-bold text-lg">{{ host.alias }}</div>
            <div class="text-sm text-gray-300">
              {{ host.username }}@{{ host.hostname }}:{{ host.port }}
              <span v-if="host.macAddress" class="ml-2 text-gray-400"
                >(MAC: {{ host.macAddress }})</span
              >
            </div>
          </div>
          <div class="space-x-2">
            <button
              v-if="host.macAddress"
              @click="wakeHost(host.id!)"
              class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Wake
            </button>
            <button
              @click="selectHost(host)"
              class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Select
            </button>
            <button
              @click="editHost(host)"
              class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Edit
            </button>
            <button
              @click="deleteHost(host.id!)"
              class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Delete
            </button>
          </div>
        </li>
        <li
          v-if="hostStore.hosts.length === 0 && !hostStore.isLoading"
          class="text-center text-gray-400 p-4"
        >
          No hosts configured yet. Add one above!
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { useHostStore, type Host } from "../stores/hostStore";

const hostStore = useHostStore();

const defaultForm: Host = {
  alias: "",
  hostname: "",
  port: 22,
  username: "",
  password: "",
  macAddress: "", // Initialize macAddress
};

const form = reactive<Host>({ ...defaultForm });
const editingHost = ref<Host | null>(null);

const emits = defineEmits(["select-host"]);

onMounted(() => {
  hostStore.fetchHosts();
});

function resetForm() {
  Object.assign(form, defaultForm);
  editingHost.value = null;
}

async function saveHost() {
  try {
    if (editingHost.value) {
      await hostStore.updateHost(editingHost.value.id!, { ...form });
    } else {
      await hostStore.addHost({ ...form });
    }
    resetForm();
  } catch (e) {
    // Error handled by store, displayed by template
  }
}

function editHost(host: Host) {
  editingHost.value = host;
  Object.assign(form, host);
}

function cancelEdit() {
  resetForm();
}

function selectHost(host: Host) {
  emits("select-host", host);
}

async function wakeHost(id: number) {
  try {
    await hostStore.sendWol(id);
    alert("WOL packet sent!");
    // Optionally refetch hosts or update status after WOL
    // hostStore.fetchHosts(); 
  } catch (e) {
    alert(`Failed to send WOL packet: ${hostStore.error}`);
  }
}

async function deleteHost(id: number) {
  if (confirm("Are you sure you want to delete this host?")) {
    try {
      await hostStore.deleteHost(id);
      if (editingHost.value && editingHost.value.id === id) {
        resetForm(); // Clear form if deleted host was being edited
      }
    } catch (e) {
      // Error handled by store, displayed by template
    }
  }
}
</script>

<style scoped></style>
