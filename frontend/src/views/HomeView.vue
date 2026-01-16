<template>
  <div class="h-full flex flex-col font-sans w-full">
    <!-- Main Scrollable Area -->
    <div class="flex-1 overflow-y-auto p-6 space-y-8">
      <div>
        <!-- Section Header -->
        <div class="flex items-center justify-between mb-8 px-1">
          <div class="flex flex-col">
            <span
              class="text-[10px] font-black text-white uppercase tracking-[0.15em]"
              >System Overview</span
            >
            <h2 class="text-xl font-black text-white tracking-tight">
              Active Infrastructure
            </h2>
          </div>
          <button
            @click="isModalOpen = true"
            class="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <Plus :size="20" stroke-width="3" />
          </button>
        </div>

        <!-- Node Grid: Shows all hosts with stats simultaneously -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="host in hostStore.hosts"
            :key="host.id"
            @click="setActiveHost(host)"
            :class="[
              'group relative flex flex-col p-6 rounded-[2.5rem] transition-all border text-left',
              activeHostId === host.id
                ? 'bg-indigo-50/50 border-indigo-200 ring-4 ring-indigo-500/5'
                : 'border-slate-800 bg-[#121214]/50 text-white border-slate-100 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-600/50',
            ]"
          >
            <!-- Card Header: Server Info & Actions -->
            <div class="flex justify-between items-start mb-6">
              <div class="flex items-center gap-4">
                <div
                  :class="[
                    'p-3 rounded-2xl transition-all shadow-sm',
                    activeHostId === host.id
                      ? 'bg-indigo-600 text-white scale-110'
                      : 'bg-slate-900 text-white',
                  ]"
                >
                  <Server :size="20" stroke-width="2.5" />
                </div>
                <div>
                  <p :class="['text-base font-black tracking-tight']">
                    {{ host.alias }}
                  </p>
                  <p
                    class="text-[10px] font-mono font-bold text-white uppercase tracking-tighter"
                  >
                    {{ host.hostname }}
                    <span v-if="host.macAddress" class="ml-2 text-gray-400"
                      >(MAC: {{ host.macAddress }})</span
                    >
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="host.macAddress"
                  @click.stop="wakeHost(host.id!)"
                  class="opacity-0 group-hover:opacity-100 p-2 hover:bg-purple-50 text-slate-300 hover:text-purple-600 rounded-xl transition-all"
                  title="Wake On LAN"
                >
                  <Zap :size="16" />
                </button>
                <button
                  @click.stop="editHost(host)"
                  class="opacity-0 group-hover:opacity-100 p-2 hover:bg-yellow-50 text-slate-300 hover:text-yellow-600 rounded-xl transition-all"
                  title="Edit Host"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  @click.stop="deleteHost(host.id!)"
                  class="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all"
                  title="Delete Host"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>

            <!-- Stats Mini-Grid for each Host -->
            <div class="grid grid-cols-2 gap-3 mb-6">
              <!-- Mini CPU Stat -->
              <div
                class="bg-black/30 rounded-2xl p-3 border border-slate-800/50"
              >
                <div class="flex items-center justify-between mb-1">
                  <span
                    class="text-[9px] font-black text-white uppercase tracking-wider"
                    >CPU</span
                  >
                  <Activity :size="12" class="text-rose-500" />
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="text-sm font-black text-white"
                    >{{ host.stats?.cpu?.percent?.toFixed(0) || 0 }}%</span
                  >
                </div>
                <div
                  class="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden"
                >
                  <div
                    class="bg-rose-500 h-full"
                    :style="{ width: `${host.stats?.cpu?.percent || 0}%` }"
                  ></div>
                </div>
              </div>

              <!-- Mini RAM Stat -->
              <div
                class="bg-black/30 rounded-2xl p-3 border border-slate-800/50"
              >
                <div class="flex items-center justify-between mb-1">
                  <span
                    class="text-[9px] font-black text-white uppercase tracking-wider"
                    >RAM</span
                  >
                  <Cpu :size="12" class="text-indigo-500" />
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="text-sm font-black text-white">{{
                    formatBytes(host.stats?.memory?.used || 0)
                  }}</span>
                </div>
                <div
                  class="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden"
                >
                  <div
                    class="bg-indigo-600 h-full"
                    :style="{
                      width: `${host.stats?.memory?.percent || 0}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Card Footer: Status & Connectivity -->
            <div
              class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div
                  class="h-2 w-2 rounded-full"
                  :class="getStatusColorClass(host.status).dot"
                ></div>
                <span
                  class="text-[10px] font-black uppercase tracking-widest"
                  :class="getStatusColorClass(host.status).text"
                  >{{ host.status || "unknown" }}</span
                >
              </div>
              <div
                class="flex items-center gap-1.5 text-[10px] font-bold text-white"
              >
                <Zap :size="12" />
                <span>{{ host.online ? "Online" : "Offline" }}</span>
              </div>
            </div>
          </div>

          <!-- Add New Node Button (Ghost Card) -->
          <!-- <button
          @click="isModalOpen = true"
          class="group flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 border-dashed border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all min-h-[220px]"
        >
          <div
            class="p-4 bg-slate-50 text-slate-300 rounded-[1.5rem] group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all mb-4"
          >
            <Plus :size="32" stroke-width="2" />
          </div>
          <p
            class="text-xs font-black text-white uppercase tracking-widest group-hover:text-indigo-600"
          >
            Add New Node
          </p>
        </button> -->
        </div>

        <!-- Empty State (Only if no hosts exist at all) -->
        <div
          v-if="hostStore.hosts.length === 0"
          class="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200"
        >
          <div
            class="p-6 bg-white rounded-[2rem] shadow-sm mb-6 text-slate-200"
          >
            <Server :size="48" stroke-width="1.5" />
          </div>
          <p class="text-sm font-black text-white uppercase tracking-widest">
            No Infrastructure Found
          </p>
          <p class="text-xs font-bold text-white mt-2 opacity-60">
            Deploy your first node to start monitoring metrics.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal Implementation -->
    <Transition name="fade">
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
                <h2 class="text-xl font-bold text-white">
                  {{ editingHost ? "Edit Host" : "Add New Host" }}
                </h2>
                <p class="text-slate-500 text-sm mt-1">
                  {{
                    editingHost
                      ? "Update the host details."
                      : "Configure a new remote endpoint."
                  }}
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
                <label
                  for="ssh-toggle"
                  class="block text-xs font-bold text-slate-400 uppercase tracking-widest"
                  >Enable SSH</label
                >
                <input
                  type="checkbox"
                  id="ssh-toggle"
                  v-model="form.sshEnabled"
                  class="toggle-switch"
                />
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
                <div class="col-span-2">
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
                    required
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
                    :placeholder="
                      editingHost ? '(leave blank to keep unchanged)' : ''
                    "
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
                  {{ editingHost ? "Update Connection" : "Save Connection" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import {
  Plus,
  Server,
  Trash2,
  X,
  Activity,
  Cpu,
  Zap,
  Pencil,
} from "lucide-vue-next";
import { useRouter } from "vue-router";

const hostStore = useHostStore();
const router = useRouter();

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

function getStatusColorClass(status: Host["status"]): {
  dot: string;
  text: string;
} {
  switch (status) {
    case "online":
      return { dot: "bg-emerald-500", text: "text-emerald-600" };
    case "offline":
      return { dot: "bg-red-500", text: "text-red-600" };
    case "error":
      return { dot: "bg-yellow-500", text: "text-yellow-600" };
    case "checking...":
      return { dot: "bg-gray-500 animate-pulse", text: "text-gray-500" };
    default:
      return { dot: "bg-gray-700", text: "text-gray-700" };
  }
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedValue = (bytes / Math.pow(k, i)).toFixed(2);
  return `${formattedValue} ${sizes[i]}`;
};

function resetForm() {
  Object.assign(form, defaultForm);
  editingHost.value = null;
}

function cancelEdit() {
  resetForm();
  isModalOpen.value = false;
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
    console.error(e);
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
  form.password = ""; // Clear password for security
  isModalOpen.value = true;
}

function setActiveHost(host: Host) {
  if (!host.sshEnabled) return;
  activeHostId.value = host?.id ?? null;
  hostStore.setSelectedHost(host);
  router.push({
    name: "dashboard",
  });
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
  if (confirm("Delete this connection?")) {
    try {
      await hostStore.deleteHost(id);
      if (activeHostId.value === id) activeHostId.value = null;
    } catch (e) {
      console.error(e);
    }
  }
}
</script>

<style scoped>
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
  -webkit-transition: 0.4s;
  transition: 0.4s;
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
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196f3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(16px);
  -ms-transform: translateX(16px);
  transform: translateX(16px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
