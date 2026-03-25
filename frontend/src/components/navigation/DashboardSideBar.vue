<template>
  <aside class="sidebar">
    <div class="sidebar-bg"></div>
    <div class="sidebar-noise"></div>

    <!-- Header -->
    <div class="sidebar-header">
      <div class="logo-container">
        <div class="logo-icon">
          <Terminal :size="20" />
        </div>
        <RouterLink :to="{ name: 'home' }" class="logo-link">
          <h1 class="logo-text">Konek</h1>
        </RouterLink>
      </div>
    </div>

    <!-- Hosts list -->
    <div class="hosts-container">
      <template v-if="willShowSavedHost">
        <div class="section-header">
          <span class="section-title">Saved Hosts</span>
          <button
            @click="isModalOpen = true"
            class="add-btn"
            title="Add new host"
          >
            <Plus :size="16" />
          </button>
        </div>

        <div class="hosts-list">
          <button
            v-for="host in hostStore.hosts"
            :key="host.id"
            @click="setActiveHost(host)"
            :class="[
              'host-card',
              { 'host-card-active': hostStore.selectedHost?.id === host.id },
            ]"
          >
            <Server :size="18" class="host-icon" />

            <div class="host-info">
              <p class="host-alias">{{ host.alias }}</p>
              <p class="host-connection">
                <span v-if="host.sshEnabled"
                  >{{ host.username }}@{{ host.hostname }}:{{ host.port }}</span
                >
                <span v-else>{{ host.hostname }}</span>
              </p>
              <div class="host-stats">
                <div class="stat-item">
                  <span class="stat-label">CPU</span>
                  <span class="stat-value"
                    >{{
                      host.stats?.cpu?.usagePercent?.toFixed(0) || "--"
                    }}%</span
                  >
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-label">MEM</span>
                  <span class="stat-value"
                    >{{
                      host.stats?.memory?.percent?.toFixed(0) || "--"
                    }}%</span
                  >
                </div>
              </div>
            </div>

            <!-- Actions: always visible on touch, hover-reveal on mouse -->
            <div class="host-actions">
              <button
                v-if="host.macAddress"
                @click.stop="wakeHost(host.id!)"
                class="action-btn wake"
                title="Wake On LAN"
              >
                <Zap :size="14" />
              </button>
              <button
                @click.stop="editHost(host)"
                class="action-btn edit"
                title="Edit Host"
              >
                <Pencil :size="14" />
              </button>
              <button
                @click.stop="deleteHost(host.id!)"
                class="action-btn delete"
                title="Delete Host"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </button>
        </div>
      </template>

      <!-- Home / no-host view -->
      <template v-else>
        <div class="home-sidebar-content">
          <div class="quick-actions-section">
            <div class="section-title qas-title">Quick Actions</div>
            <div class="action-cards">
              <button @click="isModalOpen = true" class="action-card">
                <div class="action-card-icon"><Plus :size="20" /></div>
                <div class="action-card-content">
                  <div class="action-card-title">Add New Host</div>
                  <div class="action-card-subtitle">Configure connection</div>
                </div>
              </button>
              <router-link
                :to="{ name: 'network-map' }"
                class="action-card"
                @click="emit('close')"
              >
                <div class="action-card-icon"><Network :size="20" /></div>
                <div class="action-card-content">
                  <div class="action-card-title">Network Map</div>
                  <div class="action-card-subtitle">
                    Visualize your infrastructure
                  </div>
                </div>
              </router-link>
            </div>
          </div>

          <div class="recent-activity-section">
            <div class="section-title qas-title">Infrastructure</div>
            <div class="activity-list">
              <router-link
                :to="{ name: 'home' }"
                class="activity-item"
                v-if="hostStore.hosts.length > 0"
              >
                <div class="activity-icon success"><Server :size="12" /></div>
                <div class="activity-info">
                  <p class="activity-title">
                    {{ hostStore.hosts.length }} host{{
                      hostStore.hosts.length !== 1 ? "s" : ""
                    }}
                    configured
                  </p>
                  <p class="activity-time">Ready to connect</p>
                </div>
              </router-link>

              <div class="activity-item" v-if="onlineHostsCount > 0">
                <div class="activity-icon online"><Activity :size="12" /></div>
                <div class="activity-info">
                  <p class="activity-title">
                    {{ onlineHostsCount }} host{{
                      onlineHostsCount !== 1 ? "s" : ""
                    }}
                    online
                  </p>
                  <p class="activity-time">System operational</p>
                </div>
              </div>

              <div class="activity-item" v-if="hostStore.hosts.length === 0">
                <div class="activity-icon info"><AlertCircle :size="12" /></div>
                <div class="activity-info">
                  <p class="activity-title">No hosts configured</p>
                  <p class="activity-time">
                    Add your first host to get started
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- User profile / disconnect -->
    <div class="user-profile">
      <button
        v-if="hostStore.selectedHost"
        @click="disconnectHost"
        class="disconnect-btn"
      >
        <X :size="14" />
        <span class="disconnect-label"
          >Disconnect from {{ hostStore.selectedHost.alias }}</span
        >
      </button>
      <button class="profile-card" type="button" @click="logout">
        <div class="profile-avatar">JD</div>
        <div class="profile-info">
          <p class="profile-name">Local User</p>
          <p class="profile-subtitle">Sign out of Konek</p>
        </div>
        <LogOut :size="14" class="profile-icon" />
      </button>
    </div>
  </aside>

  <!-- Add / Edit Modal -->
  <Transition name="modal-fade">
    <div v-if="isModalOpen" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">
              {{ editingHost ? "Edit Host" : "Add New Host" }}
            </h2>
            <p class="modal-subtitle">
              {{
                editingHost
                  ? "Update the host details."
                  : "Configure a new remote endpoint."
              }}
            </p>
          </div>
          <button @click="cancelEdit" class="modal-close">
            <X :size="24" />
          </button>
        </div>

        <form @submit.prevent="saveHost" class="modal-form">
          <div class="form-row">
            <label for="ssh-toggle" class="form-label">Enable SSH</label>
            <label class="toggle-switch">
              <input
                type="checkbox"
                id="ssh-toggle"
                v-model="form.sshEnabled"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Friendly Name</label>
            <input
              v-model="form.alias"
              type="text"
              required
              placeholder="e.g. Raspberry Pi Cluster"
              class="form-input"
            />
          </div>

          <div class="form-grid">
            <div :class="form.sshEnabled ? 'form-group-2' : 'form-group-full'">
              <label class="form-label">IP / Host</label>
              <input
                v-model="form.hostname"
                type="text"
                required
                placeholder="192.168.1.1"
                class="form-input form-input-mono"
              />
            </div>
            <div v-if="form.sshEnabled" class="form-group-1">
              <label class="form-label">Port</label>
              <input
                v-model="form.port"
                type="text"
                :required="form.sshEnabled"
                placeholder="22"
                class="form-input form-input-mono"
              />
            </div>
          </div>

          <div v-if="form.sshEnabled" class="form-group">
            <label class="form-label">Username</label>
            <input
              v-model="form.username"
              type="text"
              :required="form.sshEnabled"
              placeholder="root"
              class="form-input form-input-mono"
            />
          </div>

          <div v-if="form.sshEnabled" class="form-group">
            <label class="form-label">Password</label>
            <input
              v-model="form.password"
              type="password"
              :placeholder="
                editingHost ? '(leave blank to keep unchanged)' : ''
              "
              class="form-input form-input-mono"
            />
          </div>

          <div class="form-group">
            <label class="form-label">MAC Address (optional)</label>
            <input
              v-model="form.macAddress"
              type="text"
              placeholder="XX:XX:XX:XX:XX:XX"
              class="form-input form-input-mono"
            />
          </div>

          <div class="form-actions">
            <button
              v-if="editingHost"
              type="button"
              @click="cancelEdit"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              <Plus v-if="!editingHost" :size="18" />
              {{ editingHost ? "Update Connection" : "Save Connection" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import {
  Plus,
  Server,
  Terminal,
  Trash2,
  X,
  Zap,
  Pencil,
  Activity,
  AlertCircle,
  Network,
  LogOut,
} from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useSshStore } from "@/stores/SSHStore";

const hostStore = useHostStore();
const authStore = useAuthStore();
const sshStore = useSshStore();
const route = useRoute();
const router = useRouter();
const emit = defineEmits(["close"]);

const defaultForm: Host = {
  alias: "",
  hostname: "",
  port: 22,
  username: "",
  password: "",
  macAddress: "",
  sshEnabled: true,
};

const form = reactive<Host>({ ...defaultForm });
const editingHost = ref<Host | null>(null);
const isModalOpen = ref(false);

const willShowSavedHost = computed(() => route.meta.willShowSavedHost === true);
const onlineHostsCount = computed(
  () => hostStore.hosts.filter((h) => h.online || h.status === "online").length,
);

let pollingInterval: number | undefined;

onMounted(async () => {
  await hostStore.fetchHosts();
  hostStore.fetchBulkHostStatus();
  pollingInterval = window.setInterval(
    () => hostStore.fetchBulkHostStatus(),
    5000,
  );
});

onUnmounted(() => clearInterval(pollingInterval));

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
    console.error(e);
  }
}

function editHost(host: Host) {
  editingHost.value = host;
  Object.assign(form, { ...host, password: "" });
  isModalOpen.value = true;
}

function cancelEdit() {
  resetForm();
  isModalOpen.value = false;
}

function setActiveHost(host: Host) {
  if (!host.sshEnabled) return;
  hostStore.setSelectedHost(host);
  emit("close");
  if (route.name !== "dashboard") router.push({ name: "dashboard" });
}

function disconnectHost() {
  hostStore.setSelectedHost(null);
  emit("close");
  router.push({ name: "home" });
}

async function logout() {
  hostStore.setSelectedHost(null);
  sshStore.disconnect();
  await authStore.logout();
  emit("close");
  router.push({ name: "home" });
}

async function wakeHost(id: number) {
  try {
    await hostStore.sendWol(id);
    alert("WOL packet sent!");
  } catch {
    alert(`Failed to send WOL packet: ${hostStore.error}`);
  }
}

async function deleteHost(id: number) {
  if (!confirm("Are you sure you want to delete this host?")) return;
  try {
    await hostStore.deleteHost(id);
    if (editingHost.value?.id === id) resetForm();
  } catch (e) {
    console.error(e);
  }
}
</script>

<style scoped>
@reference "../../assets/css/main.css";

.sidebar {
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  @apply relative z-20 flex h-full w-[280px] max-w-[85vw] shrink-0 flex-col overflow-hidden border-r border-white/6;
}

.sidebar-bg {
  background: linear-gradient(180deg, #0f1419 0%, #0a0e12 100%);
  @apply absolute inset-0 z-0;
}

.sidebar-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  @apply absolute inset-0 z-[1];
}

.sidebar-header {
  @apply relative z-[2] shrink-0 border-b border-white/6 px-5 py-5;
}

.logo-container {
  @apply flex items-center gap-3;
}

.logo-icon {
  background: rgba(107, 140, 174, 0.15);
  @apply flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#6b8cae]/20 text-[#7fa1c3];
}

.logo-link {
  @apply no-underline;
}

.logo-text {
  @apply m-0 text-[1.2rem] font-bold tracking-[-0.02em] text-white transition-colors duration-200;
}

.logo-link:hover .logo-text {
  @apply text-[#7fa1c3];
}

.hosts-container {
  @apply relative z-[2] flex-1 overflow-x-hidden overflow-y-auto p-[0.875rem];
  -webkit-overflow-scrolling: touch;
}

.hosts-container::-webkit-scrollbar {
  width: 4px;
}
.hosts-container::-webkit-scrollbar-track {
  background: transparent;
}
.hosts-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

.section-header {
  @apply mb-3 flex items-center justify-between px-[0.375rem];
}

.section-title {
  @apply text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white/40;
}

.qas-title {
  @apply mb-[0.625rem] block px-[0.375rem];
}

.add-btn {
  background: rgba(107, 140, 174, 0.12);
  @apply flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[7px] border border-[#6b8cae]/20 text-[#7fa1c3] transition-all duration-200;
}
.add-btn:hover {
  background: rgba(107, 140, 174, 0.22);
}

.hosts-list {
  @apply flex flex-col gap-[0.375rem];
}

.host-card {
  background: rgba(20, 25, 32, 0.5);
  @apply relative flex w-full cursor-pointer items-center gap-[0.625rem] rounded-[10px] border border-white/6 p-3 text-left transition-all duration-200;
}

.host-card:hover {
  background: rgba(25, 30, 38, 0.7);
  transform: translateX(2px);
  @apply border-white/12;
}

.host-card-active {
  background: rgba(107, 140, 174, 0.12);
  @apply border-[#6b8cae]/30;
}

.host-icon {
  @apply shrink-0 text-white/45 transition-colors duration-200;
}
.host-card-active .host-icon {
  @apply text-[#7fa1c3];
}

.host-info {
  @apply min-w-0 flex-1;
}

.host-alias {
  @apply m-0 mb-[0.2rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-semibold tracking-[-0.01em] text-white/90;
}
.host-card-active .host-alias {
  @apply text-white;
}

.host-connection {
  font-family: "JetBrains Mono", monospace;
  @apply m-0 mb-[0.4rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.625rem] text-white/30;
}

.host-stats {
  background: rgba(0, 0, 0, 0.2);
  @apply flex w-fit items-center gap-2 rounded-[5px] px-[0.4rem] py-[0.3rem];
}

.stat-item {
  @apply flex items-center gap-[0.3rem];
}

.stat-label {
  font-family: "JetBrains Mono", monospace;
  @apply text-[0.5625rem] font-bold uppercase tracking-[0.05em] text-white/35;
}

.stat-value {
  font-family: "JetBrains Mono", monospace;
  @apply min-w-[26px] text-right text-[0.625rem] font-semibold text-white/70;
}
.host-card-active .stat-value {
  @apply text-[#7fa1c3];
}

.stat-divider {
  background: rgba(255, 255, 255, 0.1);
  @apply h-[10px] w-px;
}

.host-actions {
  @apply flex shrink-0 items-center gap-[0.2rem] opacity-0 transition-opacity duration-200;
}

.host-card:hover .host-actions {
  @apply opacity-100;
}

@media (hover: none) {
  .host-actions {
    @apply opacity-100;
  }
}

.action-btn {
  background: transparent;
  @apply flex min-w-[28px] cursor-pointer items-center justify-center rounded-md border-none text-white/45 transition-all duration-200;
}

.action-btn:hover {
  transform: scale(1.1);
}
.action-btn.wake:hover {
  background: rgba(168, 85, 247, 0.15);
  color: #b19dd4;
}
.action-btn.edit:hover {
  background: rgba(234, 179, 8, 0.15);
  color: #e8c368;
}
.action-btn.delete:hover {
  background: rgba(214, 93, 93, 0.15);
  color: #d68a8a;
}

.home-sidebar-content {
  @apply flex flex-col gap-4;
}

.quick-actions-section,
.recent-activity-section {
  @apply p-0;
}

.action-cards {
  @apply flex flex-col gap-[0.375rem];
}

.action-card {
  background: rgba(20, 25, 32, 0.5);
  @apply flex w-full cursor-pointer items-center gap-[0.875rem] rounded-[10px] border border-white/6 p-[0.875rem] text-left no-underline transition-all duration-200;
}

.action-card:hover {
  background: rgba(25, 30, 38, 0.7);
  transform: translateX(2px);
  @apply border-[#7fa1c3]/30;
}

.action-card-icon {
  background: rgba(127, 161, 195, 0.12);
  @apply flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#7fa1c3];
}

.action-card-content {
  @apply min-w-0 flex-1;
}

.action-card-title {
  @apply mb-[0.2rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-semibold text-white/90;
}

.action-card-subtitle {
  @apply overflow-hidden text-ellipsis whitespace-nowrap text-[0.6875rem] text-white/45;
}

.activity-list {
  @apply flex flex-col gap-[0.375rem];
}

.activity-item {
  background: rgba(20, 25, 32, 0.5);
  @apply flex items-center gap-[0.625rem] rounded-[10px] border border-white/6 p-3 no-underline;
}

.activity-icon {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px];
}

.activity-icon.success {
  background: rgba(139, 196, 160, 0.15);
  color: #8bc4a0;
}
.activity-icon.online {
  background: rgba(127, 161, 195, 0.15);
  color: #7fa1c3;
}
.activity-icon.info {
  background: rgba(232, 195, 104, 0.15);
  color: #e8c368;
}

.activity-info {
  @apply min-w-0 flex-1;
}

.activity-title {
  @apply m-0 mb-[0.125rem] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-white/90;
}

.activity-time {
  @apply m-0 text-[0.625rem] text-white/45;
}

.user-profile {
  background: rgba(10, 14, 18, 0.5);
  @apply relative z-[2] flex shrink-0 flex-col gap-[0.625rem] border-t border-white/6 p-[0.875rem];
}

.disconnect-btn {
  background: rgba(214, 93, 93, 0.1);
  font-family: inherit;
  @apply flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#d65d5d]/20 px-3 py-2 text-xs font-semibold text-[#d68a8a] transition-all duration-200;
}

.disconnect-btn:hover {
  background: rgba(214, 93, 93, 0.18);
  @apply border-[#d65d5d]/30;
}

.disconnect-label {
  @apply max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap;
}

.profile-card {
  background: rgba(20, 25, 32, 0.6);
  font-family: inherit;
  @apply flex w-full cursor-pointer items-center gap-[0.625rem] rounded-[10px] border border-white/6 p-3 text-left transition-all duration-200;
}

.profile-card:hover {
  background: rgba(27, 34, 43, 0.82);
  border-color: rgba(127, 161, 195, 0.22);
}

.profile-card:active {
  transform: translateY(1px);
}

.profile-avatar {
  background: linear-gradient(135deg, #7fa1c3 0%, #6b8cae 100%);
  @apply flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white;
}

.profile-info {
  @apply min-w-0 flex-1;
}

.profile-name {
  @apply m-0 mb-[0.125rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-semibold tracking-[-0.01em] text-white;
}

.profile-subtitle {
  @apply m-0 text-[0.625rem] text-white/40;
}

.profile-icon {
  @apply shrink-0 text-white/55;
}

.modal-overlay {
  background: rgba(0, 0, 0, 0.8);
  @apply fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-[8px];
}

@media (min-width: 640px) {
  .modal-overlay {
    @apply items-center p-6;
  }
}

.modal-content {
  background: #16161a;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  @apply relative max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] border border-white/8;
}

@media (min-width: 640px) {
  .modal-content {
    @apply max-w-[480px] rounded-[20px];
    max-height: none;
    overflow-y: visible;
  }
}

.modal-header {
  @apply flex items-start justify-between gap-4 border-b border-white/6 px-6 pb-5 pt-6;
}

@media (min-width: 640px) {
  .modal-header {
    @apply px-8 pb-6 pt-8;
  }
}

.modal-title {
  @apply m-0 mb-[0.3rem] text-lg font-bold tracking-[-0.02em] text-white;
}

@media (min-width: 640px) {
  .modal-title {
    @apply text-xl;
  }
}

.modal-subtitle {
  @apply m-0 text-sm text-white/50;
}

.modal-close {
  background: transparent;
  @apply flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none text-white/50 transition-all duration-200;
}
.modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  @apply text-white;
}

.modal-form {
  @apply px-6 pb-6 pt-5;
}

@media (min-width: 640px) {
  .modal-form {
    @apply p-8;
  }
}

.form-row {
  @apply mb-5 flex items-center justify-between;
}

.form-group {
  @apply mb-[1.125rem];
}

.form-grid {
  @apply mb-[1.125rem] grid grid-cols-[2fr_1fr] gap-3;
}

.form-group-full {
  grid-column: 1 / -1;
}
.form-group-2 {
  grid-column: span 1;
}
.form-group-1 {
  grid-column: span 1;
}

.form-label {
  @apply mb-[0.45rem] block text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white/55;
}

.form-input {
  background: rgba(20, 25, 32, 0.6);
  font-family: inherit;
  box-sizing: border-box;
  font-size: max(16px, 0.9375rem);
  @apply w-full rounded-[10px] border border-white/8 px-[0.875rem] py-3 text-white transition-all duration-200;
}

.form-input::placeholder {
  @apply text-white/22;
}
.form-input:focus {
  background: rgba(25, 30, 38, 0.8);
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
  @apply border-[#7fa1c3]/40 outline-none;
}

.form-input-mono {
  font-family: "JetBrains Mono", monospace;
  font-size: max(16px, 0.875rem);
}

.toggle-switch {
  @apply relative inline-block h-6 w-11 cursor-pointer;
}

.toggle-switch input {
  @apply h-0 w-0 opacity-0;
}

.toggle-slider {
  background: rgba(255, 255, 255, 0.1);
  @apply absolute inset-0 rounded-xl transition-all duration-300;
}

.toggle-slider::before {
  content: "";
  background: #fff;
  @apply absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-all duration-300;
}

input:checked + .toggle-slider {
  background: #7fa1c3;
}
input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.form-actions {
  @apply mt-5 flex gap-3;
}

.btn {
  font-family: inherit;
  @apply flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-[0.875rem] text-[0.9375rem] font-semibold transition-all duration-200;
}

.btn-primary {
  @apply bg-[#7fa1c3] text-white;
}
.btn-primary:hover {
  @apply bg-[#6b8cae];
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(127, 161, 195, 0.3);
}

.btn-secondary {
  background: rgba(140, 140, 150, 0.15);
  @apply text-white/80;
}
.btn-secondary:hover {
  background: rgba(140, 140, 150, 0.25);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-fade-enter-active .modal-content,
  .modal-fade-leave-active .modal-content {
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
  }
  .modal-fade-enter-from .modal-content,
  .modal-fade-leave-to .modal-content {
    transform: scale(0.96);
    opacity: 0;
  }
}
</style>
