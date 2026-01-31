<template>
  <aside class="sidebar">
    <!-- Background layers -->
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

      <template v-if="routeName !== 'home'">
        <div class="section-header">
          <span class="section-title">Saved Hosts</span>
          <button @click="isModalOpen = true" class="add-btn" title="Add new host">
            <Plus :size="16" />
          </button>
        </div>

        <div class="hosts-list">
          <button v-for="host in hostStore.hosts" :key="host.id" @click="setActiveHost(host)"
            :class="['host-card', { 'host-card-active': hostStore.selectedHost?.id === host.id }]">
            <Server :size="18" class="host-icon" />

            <div class="host-info">
              <p class="host-alias">{{ host.alias }}</p>
              <p class="host-connection">
                <span v-if="host.sshEnabled">{{ host.username }}@{{ host.hostname }}:{{ host.port }}</span>
                <span v-else>{{ host.hostname }}</span>
              </p>

              <!-- Improved stats display -->
              <div class="host-stats">
                <div class="stat-item">
                  <span class="stat-label">CPU</span>
                  <span class="stat-value">{{ host.stats?.cpu?.usagePercent?.toFixed(0) || "--" }}%</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-label">MEM</span>
                  <span class="stat-value">{{ host.stats?.memory?.percent?.toFixed(0) || "--" }}%</span>
                </div>
              </div>
            </div>

            <div class="host-actions">
              <button v-if="host.macAddress" @click.stop="wakeHost(host.id!)" class="action-btn wake"
                title="Wake On LAN">
                <Zap :size="14" />
              </button>
              <button @click.stop="editHost(host)" class="action-btn edit" title="Edit Host">
                <Pencil :size="14" />
              </button>
              <button @click.stop="deleteHost(host.id!)" class="action-btn delete" title="Delete Host">
                <Trash2 :size="14" />
              </button>
            </div>
          </button>
        </div>
      </template>

      <!-- Home page content -->
      <template v-else>
        <div class="home-sidebar-content">
          <!-- Quick Stats -->
          <div class="stats-card">
            <div class="stats-card-header">
              <Server :size="20" class="stats-card-icon" />
              <div class="stats-card-title">Infrastructure</div>
            </div>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-box-value">{{ hostStore.hosts.length }}</div>
                <div class="stat-box-label">Total Hosts</div>
              </div>
              <div class="stat-box">
                <div class="stat-box-value online">{{ onlineHostsCount }}</div>
                <div class="stat-box-label">Online</div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions-section">
            <div class="section-title" style="margin-bottom: 0.75rem; padding: 0 0.5rem;">Quick Actions</div>
            <button @click="isModalOpen = true" class="action-card">
              <div class="action-card-icon">
                <Plus :size="20" />
              </div>
              <div class="action-card-content">
                <div class="action-card-title">Add New Host</div>
                <div class="action-card-subtitle">Configure connection</div>
              </div>
            </button>
          </div>

          <!-- Recent Activity -->
          <div class="recent-activity-section">
            <div class="section-title" style="margin-bottom: 0.75rem; padding: 0 0.5rem;">Recent Activity</div>
            <div class="activity-list">
              <div class="activity-item" v-if="hostStore.hosts.length > 0">
                <div class="activity-icon success">
                  <Server :size="12" />
                </div>
                <div class="activity-info">
                  <p class="activity-title">{{ hostStore.hosts.length }} host{{ hostStore.hosts.length !== 1 ? 's' : ''
                    }} configured</p>
                  <p class="activity-time">Ready to connect</p>
                </div>
              </div>

              <div class="activity-item" v-if="onlineHostsCount > 0">
                <div class="activity-icon online">
                  <Activity :size="12" />
                </div>
                <div class="activity-info">
                  <p class="activity-title">{{ onlineHostsCount }} host{{ onlineHostsCount !== 1 ? 's' : '' }} online
                  </p>
                  <p class="activity-time">System operational</p>
                </div>
              </div>

              <div class="activity-item" v-if="hostStore.hosts.length === 0">
                <div class="activity-icon info">
                  <AlertCircle :size="12" />
                </div>
                <div class="activity-info">
                  <p class="activity-title">No hosts configured</p>
                  <p class="activity-time">Add your first host to get started</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- User profile -->
    <div class="user-profile">
      <div class="profile-card">
        <div class="profile-avatar">JD</div>
        <div class="profile-info">
          <p class="profile-name">Local User</p>
          <p class="profile-subtitle">Settings & Profile</p>
        </div>
        <Settings :size="14" class="profile-icon" />
      </div>
    </div>
  </aside>

  <!-- Modal -->
  <Transition name="modal-fade">
    <div v-if="isModalOpen" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">{{ editingHost ? "Edit Host" : "Add New Host" }}</h2>
            <p class="modal-subtitle">
              {{ editingHost ? "Update the host details." : "Configure a new remote endpoint." }}
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
              <input type="checkbox" id="ssh-toggle" v-model="form.sshEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Friendly Name</label>
            <input v-model="form.alias" type="text" required placeholder="e.g. Raspberry Pi Cluster"
              class="form-input" />
          </div>

          <div class="form-grid">
            <div :class="{ 'form-group-full': !form.sshEnabled, 'form-group-2': form.sshEnabled }">
              <label class="form-label">IP / Host</label>
              <input v-model="form.hostname" type="text" required placeholder="192.168.1.1"
                class="form-input form-input-mono" />
            </div>

            <div v-if="form.sshEnabled" class="form-group-1">
              <label class="form-label">Port</label>
              <input v-model="form.port" type="text" :required="form.sshEnabled" placeholder="22"
                class="form-input form-input-mono" />
            </div>
          </div>

          <div v-if="form.sshEnabled" class="form-group">
            <label class="form-label">Username</label>
            <input v-model="form.username" type="text" :required="form.sshEnabled" placeholder="root"
              class="form-input form-input-mono" />
          </div>

          <div v-if="form.sshEnabled" class="form-group">
            <label class="form-label">Password</label>
            <input v-model="form.password" type="password"
              :placeholder="editingHost ? '(leave blank to keep unchanged)' : ''" class="form-input form-input-mono" />
          </div>

          <div class="form-group">
            <label class="form-label">MAC Address (optional)</label>
            <input v-model="form.macAddress" type="text" placeholder="XX:XX:XX:XX:XX:XX"
              class="form-input form-input-mono" />
          </div>

          <div class="form-actions">
            <button v-if="editingHost" type="button" @click="cancelEdit" class="btn btn-secondary">
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
import { Plus, Server, Terminal, Settings, Trash2, X, Zap, Pencil, Activity, AlertCircle } from "lucide-vue-next";
import { useRoute } from "vue-router";

const hostStore = useHostStore();
const route = useRoute();

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
const activeHostId = ref<number | null>(null);
const editingHost = ref<Host | null>(null);
const isModalOpen = ref(false);
const routeName = computed(() => route.name);

// Computed property for online hosts count
const onlineHostsCount = computed(() =>
  hostStore.hosts.filter(host => host.online || host.status === 'online').length
);

let pollingInterval: number | undefined;

onMounted(async () => {
  await hostStore.fetchHosts();
  hostStore.fetchBulkHostStatus();
  pollingInterval = window.setInterval(() => {
    hostStore.fetchBulkHostStatus();
  }, 5000);
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
    console.error(e);
  }
}

function editHost(host: Host) {
  editingHost.value = host;
  form.alias = host.alias;
  form.hostname = host.hostname;
  form.port = host.port;
  form.username = host.username;
  form.macAddress = host.macAddress;
  form.sshEnabled = host.sshEnabled;
  form.password = "";
  isModalOpen.value = true;
}

function cancelEdit() {
  resetForm();
  isModalOpen.value = false;
}

function setActiveHost(host: Host) {
  if (!host.sshEnabled) return;
  activeHostId.value = host?.id ?? null;
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
        resetForm();
      }
    } catch (e) {
      console.error(e);
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.sidebar {
  position: relative;
  width: 280px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Background layers */
.sidebar-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0f1419 0%, #0a0e12 100%);
  z-index: 0;
}

.sidebar-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Header */
.sidebar-header {
  position: relative;
  z-index: 2;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(107, 140, 174, 0.15);
  border: 1px solid rgba(107, 140, 174, 0.2);
  border-radius: 12px;
  color: #7fa1c3;
}

.logo-link {
  text-decoration: none;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0;
  transition: color 0.2s ease;
}

.logo-link:hover .logo-text {
  color: #7fa1c3;
}

/* Hosts container */
.hosts-container {
  position: relative;
  z-index: 2;
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.hosts-container::-webkit-scrollbar {
  width: 6px;
}

.hosts-container::-webkit-scrollbar-track {
  background: transparent;
}

.hosts-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.hosts-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(107, 140, 174, 0.12);
  border: 1px solid rgba(107, 140, 174, 0.2);
  border-radius: 8px;
  color: #7fa1c3;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: rgba(107, 140, 174, 0.2);
  transform: scale(1.05);
}

/* Hosts list */
.hosts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.host-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  overflow: hidden;
}

.host-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(2px);
}

.host-card-active {
  background: rgba(107, 140, 174, 0.12);
  border-color: rgba(107, 140, 174, 0.3);
  box-shadow: 0 0 0 1px rgba(107, 140, 174, 0.1);
}

.host-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s ease;
}

.host-card-active .host-icon {
  color: #7fa1c3;
}

.host-info {
  flex: 1;
  min-width: 0;
}

.host-alias {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.host-card-active .host-alias {
  color: #ffffff;
}

.host-connection {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'JetBrains Mono', monospace;
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Improved stats styling */
.host-stats {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  width: fit-content;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'JetBrains Mono', monospace;
}

.stat-value {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'JetBrains Mono', monospace;
  min-width: 28px;
  text-align: right;
}

.host-card-active .stat-value {
  color: #7fa1c3;
}

.stat-divider {
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.host-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.host-card:hover .host-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
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

/* Home Sidebar Content */
.home-sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-card {
  padding: 1.25rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.stats-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stats-card-icon {
  color: #7fa1c3;
}

.stats-card-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-box {
  padding: 1rem;
  background: rgba(10, 14, 18, 0.5);
  border-radius: 12px;
  text-align: center;
}

.stat-box-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.25rem;
}

.stat-box-value.online {
  color: #8bc4a0;
}

.stat-box-label {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

/* Quick Actions */
.quick-actions-section {
  padding: 0;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(127, 161, 195, 0.3);
  transform: translateX(2px);
}

.action-card-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(127, 161, 195, 0.15);
  border-radius: 12px;
  color: #7fa1c3;
}

.action-card-content {
  flex: 1;
}

.action-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.25rem;
}

.action-card-subtitle {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Recent Activity */
.recent-activity-section {
  padding: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.activity-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
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
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 0.125rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* User profile */
.user-profile {
  position: relative;
  z-index: 2;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 14, 18, 0.5);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.profile-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7fa1c3 0%, #6b8cae 100%);
  border-radius: 50%;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.125rem 0;
  letter-spacing: -0.01em;
}

.profile-subtitle {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.profile-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: #16161a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.375rem 0;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.modal-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

/* Form */
.modal-form {
  padding: 2rem;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
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
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.form-input:focus {
  outline: none;
  background: rgba(25, 30, 38, 0.8);
  border-color: rgba(127, 161, 195, 0.4);
  box-shadow: 0 0 0 3px rgba(127, 161, 195, 0.1);
}

.form-input-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.3s ease;
}

input:checked+.toggle-slider {
  background: #7fa1c3;
}

input:checked+.toggle-slider::before {
  transform: translateX(20px);
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #7fa1c3;
  color: #ffffff;
}

.btn-primary:hover {
  background: #6b8cae;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(127, 161, 195, 0.3);
}

.btn-secondary {
  background: rgba(140, 140, 150, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.btn-secondary:hover {
  background: rgba(140, 140, 150, 0.25);
}

/* Modal animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>