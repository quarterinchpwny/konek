<template>
  <aside
    class="w-72 bg-[#121214] border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300"
  >
    <div
      class="p-6 flex items-center justify-between border-b border-slate-800"
    >
      <div class="flex items-center gap-2">
        <div class="p-2 bg-indigo-500/10 rounded-lg">
          <Terminal :size="20" class="text-indigo-400" />
        </div>
        <RouterLink :to="{ name: 'home' }">
          <h1 class="font-bold text-white tracking-tight text-lg">
            Konek
          </h1></RouterLink
        >
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div>
        <div class="flex items-center justify-between mb-4 px-2">
          <span
            class="text-xs font-semibold text-slate-500 uppercase tracking-widest"
            >Saved Hosts</span
          >
          <button
            @click="isModalOpen = true"
            class="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <Plus :size="16" />
          </button>
        </div>

        <div class="space-y-1">
          <button
            v-for="host in hostStore.hosts"
            :key="host.id"
            @click="setActiveHost(host)"
            :class="[
              'w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              hostStore.selectedHost?.id === host.id
                ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30'
                : 'hover:bg-slate-800/50 text-slate-400',
            ]"
          >
            <Server
              :size="18"
              :class="
                hostStore.selectedHost?.id === host.id
                  ? 'text-indigo-400'
                  : 'text-slate-500'
              "
            />
            <div class="flex-1 text-left truncate">
              <p
                :class="[
                  'text-sm font-medium truncate',
                  hostStore.selectedHost?.id === host.id ? 'text-white' : '',
                ]"
              >
                {{ host.alias }}
              </p>
              <p class="text-[10px] opacity-60 font-mono">
                <span v-if="host.sshEnabled">{{ host.username }}@{{ host.hostname }}:{{ host.port }}</span>
                <span v-else>{{ host.hostname }}</span>
              </p>
              <p class="text-[10px] text-slate-500 font-mono mt-1">
                CPU:
                {{ host.stats?.cpu?.usagePercent?.toFixed(0) || "..." }}% | Mem:
                {{ host.stats?.memory?.percent?.toFixed(0) || "..." }}%
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="host.macAddress"
                @click.stop="wakeHost(host.id!)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:text-purple-400 transition-opacity"
                title="Wake On LAN"
              >
                <Zap :size="14" />
              </button>
              <button
                @click.stop="editHost(host)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:text-yellow-400 transition-opacity"
                title="Edit Host"
              >
                <Pencil :size="14" />
              </button>
              <button
                @click.stop="deleteHost(host.id!)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                title="Delete Host"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- User Profile -->
    <div class="p-4 border-t border-slate-800 bg-[#0c0c0e]">
      <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50">
        <div
          class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold"
        >
          JD
        </div>
        <div class="flex-1 min-w-0 text-xs">
          <p class="text-white font-medium">Local User</p>
          <p class="text-slate-500 truncate">Settings & Profile</p>
        </div>
        <Settings :size="14" class="text-slate-600" />
      </div>
    </div>
  </aside>
  <div
    v-if="isModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-6"
  >
    <div
      class="absolute inset-0 bg-black/80 backdrop-blur-sm"
      @click="cancelEdit"
    ></div>
    <div
      class="relative w-full max-w-md bg-[#16161a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
    >
      <div class="p-8">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h2 class="text-xl font-bold text-white">{{ editingHost ? 'Edit Host' : 'Add New Host' }}</h2>
            <p class="text-slate-500 text-sm mt-1">
              {{ editingHost ? 'Update the host details.' : 'Configure a new remote endpoint.' }}
            </p>
          </div>
          <button
            @click="cancelEdit"
            class="text-slate-500 hover:text-white transition-colors"
          >
            <X :size="24" />
          </button>
        </div>

        <form @submit.prevent="saveHost" class="space-y-5">
          <div class="flex items-center justify-between">
            <label for="ssh-toggle" class="block text-xs font-bold text-slate-400 uppercase tracking-widest"
              >Enable SSH</label
            >
            <label class="toggle-switch">
              <input type="checkbox" id="ssh-toggle" v-model="form.sshEnabled">
              <span class="slider round"></span>
            </label>
          </div>
          <div>
            <label
              class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Friendly Name</label
            >
            <input
              v-model="form.alias"
              type="text"
              required
              placeholder="e.g. Raspberry Pi Cluster"
              class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700"
            />
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div :class="{'col-span-3': !form.sshEnabled, 'col-span-2': form.sshEnabled}">
              <label
                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >IP / Host</label
              >
              <input
                v-model="form.hostname"
                type="text"
                required
                placeholder="192.168.1.1"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono text-sm"
              />
            </div>

            <div v-if="form.sshEnabled">
              <label
                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Port</label
              >
              <input
                v-model="form.port"
                type="text"
                :required="form.sshEnabled"
                placeholder="22"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono text-sm"
              />
            </div>
            <div class="col-span-3" v-if="form.sshEnabled">
              <label
                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Username</label
              >
              <input
                v-model="form.username"
                type="text"
                :required="form.sshEnabled"
                placeholder="root"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono text-sm"
              />
            </div>
            <div class="col-span-3" v-if="form.sshEnabled">
              <label
                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Password</label
              >
              <input
                v-model="form.password"
                type="password"
                :placeholder="editingHost ? '(leave blank to keep unchanged)' : ''"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono text-sm"
              />
            </div>
            <div class="col-span-3">
              <label
                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >MAC Address (optional)</label
              >
              <input
                v-model="form.macAddress"
                type="text"
                placeholder="XX:XX:XX:XX:XX:XX"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono text-sm"
              />
            </div>
          </div>
          <div class="flex items-center gap-4 mt-4">
            <button
              v-if="editingHost"
              type="button"
              @click="cancelEdit"
              class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Plus v-if="!editingHost" :size="18" />
              {{ editingHost ? 'Update Connection' : 'Save Connection' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import { Plus, Server, Terminal, Settings, Trash2, X, Zap, Pencil } from "lucide-vue-next";
const hostStore = useHostStore();

const defaultForm: Host = {
  alias: "",
  hostname: "",
  port: 22,
  username: "",
  password: "",
  macAddress: "", // Initialize macAddress
  sshEnabled: true,
};

const form = reactive<Host>({ ...defaultForm });
const activeHostId = ref<number | null>(null);
const editingHost = ref<Host | null>(null);
const isModalOpen = ref(false);
const emits = defineEmits(["select-host"]);

let pollingInterval: number | undefined;

onMounted(async () => {
  await hostStore.fetchHosts();
  hostStore.fetchBulkHostStatus(); // Initial check

  pollingInterval = window.setInterval(() => {
    hostStore.fetchBulkHostStatus();
  }, 5000); // Poll every 5 seconds
});

onUnmounted(() => {
  clearInterval(pollingInterval);
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
    isModalOpen.value = false;
    await hostStore.fetchHosts();
  } catch (e) {
    // Error handled by store, displayed by template
  }
}

function editHost(host: Host) {
  editingHost.value = host;
  // Make a copy to avoid reactive changes on the original object
  form.alias = host.alias;
  form.hostname = host.hostname;
  form.port = host.port;
  form.username = host.username;
  form.macAddress = host.macAddress;
  form.sshEnabled = host.sshEnabled;
  form.password = ''; // Clear password for security
  isModalOpen.value = true;
}

function cancelEdit() {
  resetForm();
  isModalOpen.value = false;
}

function setActiveHost(host: Host) {
  if (!host.sshEnabled) return;
  activeHostId.value = host?.id;
  hostStore.setSelectedHost(host);
}

async function wakeHost(id: number) {
  try {
    await hostStore.sendWol(id);
    alert("WOL packet sent!");
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
<style>
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(16px);
  -ms-transform: translateX(16px);
  transform: translateX(16px);
}
</style>
