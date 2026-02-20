<template>
  <div :class="['home-page', { embedded: embedded }]">
    <div v-if="!embedded" class="home-bg"></div>
    <div v-if="!embedded" class="home-noise"></div>

    <div class="home-shell">
      <header v-if="!embedded" class="top-strip blur-layer">
        <nav class="top-nav">
          <button
            v-for="item in topNav"
            :key="item"
            class="top-nav-item"
            :class="{ active: item === 'Main' }"
          >
            {{ item }}
          </button>
        </nav>
        <div class="top-meta">{{ nowLabel }}</div>
      </header>

      <header class="page-header" v-if="!embedded">
        <div>
          <p class="header-label">System Overview</p>
          <h2 class="header-title">Active Infrastructure</h2>
        </div>
        <button
          @click="isModalOpen = true"
          class="add-host-btn"
          title="Add new host"
        >
          <Plus :size="16" />
          <span>Add Host</span>
        </button>
      </header>

      <div v-if="hostStore.hosts.length === 0" class="empty-state">
        <div class="empty-card">
          <Server :size="42" />
          <p class="empty-title">No infrastructure found</p>
          <p class="empty-subtitle">Add your first host to start monitoring.</p>
          <button @click="isModalOpen = true" class="add-host-btn">
            <Plus :size="16" />
            <span>Add First Host</span>
          </button>
        </div>
      </div>

      <section v-else class="dashboard-grid">
        <article class="panel panel-primary">
          <div class="panel-head">
            <h3>{{ selectedHost?.alias || "Host Overview" }}</h3>
            <span
              class="status-pill"
              :class="statusClass(selectedHost?.status)"
              >{{ selectedHost?.status || "unknown" }}</span
            >
          </div>

          <p class="host-meta">
            {{ selectedHost?.username || "root" }}@{{
              selectedHost?.hostname || "n/a"
            }}:{{ selectedHost?.port || 22 }}
          </p>

          <div class="meter-row">
            <div class="meter-label">
              <span>CPU</span
              ><span>{{ toPct(selectedHost?.stats?.cpu?.usagePercent) }}</span>
            </div>
            <div class="meter-track">
              <div
                class="meter-fill cpu"
                :style="{
                  width: `${clamp(selectedHost?.stats?.cpu?.usagePercent)}%`,
                }"
              ></div>
            </div>
          </div>
          <div class="meter-row">
            <div class="meter-label">
              <span>RAM</span
              ><span>{{ toPct(selectedHost?.stats?.memory?.percent) }}</span>
            </div>
            <div class="meter-track">
              <div
                class="meter-fill mem"
                :style="{
                  width: `${clamp(selectedHost?.stats?.memory?.percent)}%`,
                }"
              ></div>
            </div>
          </div>

          <div class="panel-list">
            <button
              v-for="host in hostStore.hosts"
              :key="host.id"
              class="list-row"
              :class="{ active: host.id === selectedHostId }"
              @click="selectHost(host)"
            >
              <span>{{ host.alias }}</span>
              <span>{{ toPct(host.stats?.cpu?.usagePercent) }}</span>
            </button>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h3>Infrastructure</h3>
            <span class="muted">{{ hostStore.hosts.length }} hosts</span>
          </div>
          <div class="host-cards">
            <div
              v-for="host in hostStore.hosts"
              :key="`mini-${host.id}`"
              class="mini-host-card"
            >
              <div class="mini-head">
                <span>{{ host.alias }}</span>
                <span
                  class="mini-status"
                  :class="statusClass(host.status)"
                ></span>
              </div>
              <div class="mini-meta">{{ host.hostname }}</div>
              <div class="mini-meter">
                <div
                  class="mini-fill"
                  :style="{ width: `${clamp(host.stats?.memory?.percent)}%` }"
                ></div>
              </div>
              <div class="mini-actions">
                <button class="icon-btn" @click="selectHost(host)">
                  <Server :size="13" />
                </button>
                <button class="icon-btn" @click="editHost(host)">
                  <Pencil :size="13" />
                </button>
                <button
                  v-if="host.macAddress"
                  class="icon-btn"
                  @click="wakeHost(host.id!)"
                >
                  <Zap :size="13" />
                </button>
                <button class="icon-btn danger" @click="deleteHost(host.id!)">
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h3>Service Summary</h3>
          </div>
          <div class="stat-grid">
            <div class="stat-cell">
              <span>Online</span><strong>{{ onlineHosts }}</strong>
            </div>
            <div class="stat-cell">
              <span>Offline</span
              ><strong>{{ hostStore.hosts.length - onlineHosts }}</strong>
            </div>
            <div class="stat-cell">
              <span>SSH Enabled</span><strong>{{ sshEnabledHosts }}</strong>
            </div>
            <div class="stat-cell">
              <span>WOL Ready</span><strong>{{ wolHosts }}</strong>
            </div>
          </div>
          <div class="quick-list">
            <div class="quick-row">
              <HardDrive :size="14" /> Storage health monitored
            </div>
            <div class="quick-row">
              <Activity :size="14" /> Bulk checks every 5s
            </div>
            <div class="quick-row">
              <Wifi :size="14" /> Network map available
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h3>Bookmarks</h3>
          </div>
          <div class="bookmark-grid">
            <a
              v-for="item in mediaBookmarks"
              :key="item.name"
              :href="item.url"
              target="_blank"
              class="bookmark-chip media-bookmark"
            >
              <ExternalLink :size="12" />
              <span>{{ item.name }}</span>
            </a>
            <a
              v-for="item in defaultBookmarks"
              :key="item"
              href="#"
              @click.prevent
              class="bookmark-chip"
            >
              <Bookmark :size="12" />
              <span>{{ item }}</span>
            </a>
          </div>
        </article>

        <article class="panel panel-activity">
          <RecentActivity :hostId="selectedHost?.id" />
        </article>

        <article class="panel">
          <div class="panel-head">
            <h3>SSH</h3>
          </div>
          <div class="ssh-list">
            <button
              v-for="host in sshHosts"
              :key="`ssh-${host.id}`"
              class="ssh-row"
              @click="selectHost(host)"
            >
              <span>{{ host.alias }}</span>
              <span class="muted">{{ host.online ? "online" : "idle" }}</span>
            </button>
          </div>
        </article>
      </section>
    </div>

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
                    : "Configure a new endpoint."
                }}
              </p>
            </div>
            <button @click="cancelEdit" class="modal-close">
              <X :size="20" />
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
                class="form-input"
              />
            </div>

            <div class="form-grid">
              <div
                :class="{
                  'form-group-full': !form.sshEnabled,
                  'form-group-2': form.sshEnabled,
                }"
              >
                <label class="form-label">IP / Host</label>
                <input
                  v-model="form.hostname"
                  type="text"
                  required
                  class="form-input"
                />
              </div>

              <div v-if="form.sshEnabled" class="form-group-1">
                <label class="form-label">Port</label>
                <input
                  v-model="form.port"
                  type="text"
                  :required="form.sshEnabled"
                  class="form-input"
                />
              </div>
            </div>

            <div v-if="form.sshEnabled" class="form-group">
              <label class="form-label">Username</label>
              <input
                v-model="form.username"
                type="text"
                :required="form.sshEnabled"
                class="form-input"
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
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">MAC Address (optional)</label>
              <input v-model="form.macAddress" type="text" class="form-input" />
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
                {{ editingHost ? "Update Host" : "Save Host" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, watch } from "vue";
import { useHostStore, type Host } from "@/stores/hostStore";
import RecentActivity from "@/components/RecentActivity.vue";
import {
  Plus,
  Server,
  Trash2,
  X,
  Zap,
  Pencil,
  HardDrive,
  Activity,
  Wifi,
  Bookmark,
  ExternalLink,
} from "lucide-vue-next";

const props = defineProps<{
  embedded?: boolean;
}>();

const hostStore = useHostStore();

const topNav = ["Main", "Media", "Reddit", "News", "AI", "Kanban", "Others"];
const defaultBookmarks = [
  "Proxmox",
  "Portainer",
  "Prowlarr",
  "Vaultwarden",
  "Immich",
  "VS Code",
  "Gitea",
];

const mediaBookmarks = ref<{ name: string; url: string }[]>([]);

const nowLabel = computed(() => {
  const d = new Date();
  return d.toLocaleString();
});

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
const selectedHostId = ref<number | null>(hostStore.selectedHost?.id ?? null);
const editingHost = ref<Host | null>(null);
const isModalOpen = ref(false);
let pollingInterval: number | undefined;

const selectedHost = computed(
  () =>
    hostStore.hosts.find((h) => h.id === selectedHostId.value) ??
    hostStore.hosts[0] ??
    null,
);

const fetchMediaBookmarks = async () => {
  if (!selectedHost.value?.id) {
    mediaBookmarks.value = [];
    return;
  }
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/hosts/${selectedHost.value.id}/media`,
    );
    if (res.ok) {
      const data = await res.json();
      mediaBookmarks.value = data
        .filter((c: any) => c.enabled)
        .map((c: any) => ({
          name: c.serviceType.charAt(0).toUpperCase() + c.serviceType.slice(1),
          url: c.url,
        }));
    }
  } catch (e) {
    console.error("Failed to fetch media bookmarks", e);
  }
};

watch(() => selectedHost.value?.id, fetchMediaBookmarks);

const onlineHosts = computed(
  () => hostStore.hosts.filter((h) => h.online).length,
);
const sshEnabledHosts = computed(
  () => hostStore.hosts.filter((h) => h.sshEnabled).length,
);
const wolHosts = computed(
  () => hostStore.hosts.filter((h) => !!h.macAddress).length,
);
const sshHosts = computed(() => hostStore.hosts.filter((h) => h.sshEnabled));

const clamp = (val?: number) =>
  Math.min(100, Math.max(0, Math.round(val || 0)));
const toPct = (val?: number) => `${clamp(val)}%`;

const statusClass = (status?: Host["status"]) => {
  if (status === "online") return "ok";
  if (status === "offline") return "off";
  if (status === "error" || status === "auth_failed") return "err";
  return "unknown";
};

onMounted(async () => {
  await hostStore.fetchHosts();
  await hostStore.fetchBulkHostStatus();

  if (!selectedHostId.value && hostStore.hosts[0]?.id) {
    selectedHostId.value = hostStore.hosts[0].id ?? null;
  }

  pollingInterval = window.setInterval(async () => {
    await hostStore.fetchBulkHostStatus();
  }, 5000);
});

onUnmounted(() => {
  clearInterval(pollingInterval);
});

async function selectHost(host: Host) {
  if (!host.id) return;
  selectedHostId.value = host.id;
  await hostStore.setSelectedHost(host);
}

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

    if (!selectedHostId.value && hostStore.hosts[0]?.id) {
      selectedHostId.value = hostStore.hosts[0].id ?? null;
    }
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

async function wakeHost(id: number) {
  try {
    await hostStore.sendWol(id);
    alert("WOL packet sent!");
  } catch {
    alert(`Failed to send WOL packet: ${hostStore.error}`);
  }
}

async function deleteHost(id: number) {
  if (!confirm("Delete this connection?")) return;

  try {
    await hostStore.deleteHost(id);

    if (selectedHostId.value === id) {
      selectedHostId.value = hostStore.hosts[0]?.id ?? null;
    }
  } catch (e) {
    console.error(e);
  }
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap");

/* ── Root ────────────────────────────────────────────────────── */
.home-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: #d4d9e6;
}

.home-page.embedded {
  background: transparent;
}

.home-page.embedded .home-shell {
  padding: 0;
}

/* ── Background ──────────────────────────────────────────────── */
.home-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  z-index: 0;
}

.home-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* ── Shell ───────────────────────────────────────────────────── */
.home-shell {
  position: relative;
  z-index: 2;
  height: 100%;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

/* ── Blur helper ─────────────────────────────────────────────── */
.blur-layer {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ── Top strip ───────────────────────────────────────────────── */
.top-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(20, 25, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.35rem 0.75rem;
}

.top-nav {
  display: flex;
  gap: 0.25rem;
  padding: 0.2rem;
  background: rgba(30, 35, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.top-nav-item {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.top-nav-item:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.03);
}

.top-nav-item.active {
  color: #7fa1c3;
  background: rgba(127, 161, 195, 0.12);
}

.top-meta {
  font-size: 0.72rem;
  font-family: "JetBrains Mono", monospace;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* ── Page header ─────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.1rem;
}

.header-label {
  margin: 0;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.header-title {
  margin: 0.2rem 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ── Add host button ─────────────────────────────────────────── */
.add-host-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(127, 161, 195, 0.12);
  color: #7fa1c3;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-host-btn:hover {
  background: rgba(127, 161, 195, 0.2);
  border-color: rgba(127, 161, 195, 0.3);
}

/* ── Dashboard grid ──────────────────────────────────────────── */
.dashboard-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(min-content, max-content);
  gap: 0.65rem;
}

@media (max-width: 1400px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  
  .panel-activity {
    grid-column: span 1;
  }
}

/* ── Panel ───────────────────────────────────────────────────── */
.panel {
  background: rgba(20, 25, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.75rem;
  min-height: 0;
  overflow: auto;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color 0.2s ease;
}

.panel:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.panel-primary {
  grid-row: span 2;
}

.panel-activity {
  grid-column: span 2;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.panel-head h3 {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.01em;
}

.muted {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.72rem;
}

/* ── Status pills ────────────────────────────────────────────── */
.status-pill {
  font-size: 0.62rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  border: 1px solid;
}

.status-pill.ok,
.mini-status.ok {
  color: #8bd5a8;
  border-color: rgba(139, 213, 168, 0.35);
  background: rgba(139, 213, 168, 0.08);
}
.status-pill.off,
.mini-status.off {
  color: #f2b4b4;
  border-color: rgba(242, 180, 180, 0.35);
  background: rgba(242, 180, 180, 0.08);
}
.status-pill.err,
.mini-status.err {
  color: #f2cf8d;
  border-color: rgba(242, 207, 141, 0.35);
  background: rgba(242, 207, 141, 0.08);
}
.status-pill.unknown,
.mini-status.unknown {
  color: rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.12);
}

/* ── Host meta ───────────────────────────────────────────────── */
.host-meta {
  margin: 0 0 0.75rem;
  font-size: 0.7rem;
  font-family: "JetBrains Mono", monospace;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
}

/* ── Meters ──────────────────────────────────────────────────── */
.meter-row {
  margin-bottom: 0.55rem;
}

.meter-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: rgba(255, 255, 255, 0.5);
}

.meter-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.meter-fill.cpu {
  background: linear-gradient(to right, #7fa1c3, #a3c4e8);
}
.meter-fill.mem {
  background: linear-gradient(to right, #8bd5a8, #b0e8c4);
}

/* ── Panel list ──────────────────────────────────────────────── */
.panel-list {
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.list-row {
  display: flex;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: -0.01em;
}

.list-row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
}

.list-row.active {
  border-color: rgba(127, 161, 195, 0.45);
  background: rgba(127, 161, 195, 0.08);
  color: #7fa1c3;
}

/* ── Host cards ──────────────────────────────────────────────── */
.host-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.mini-host-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 0.5rem;
  transition: border-color 0.2s ease;
}

.mini-host-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.mini-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: -0.01em;
}

.mini-status {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 1px solid;
}

.mini-meta {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.65rem;
  font-family: "JetBrains Mono", monospace;
  margin: 0.2rem 0;
}

.mini-meter {
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  background: linear-gradient(to right, #7fa1c3, #a3c4e8);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.mini-actions {
  margin-top: 0.4rem;
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  border-color: rgba(255, 255, 255, 0.14);
}

.icon-btn.danger {
  color: rgba(242, 180, 180, 0.6);
}
.icon-btn.danger:hover {
  color: #f2b4b4;
  background: rgba(242, 180, 180, 0.08);
  border-color: rgba(242, 180, 180, 0.2);
}

/* ── Stat grid ───────────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}

.stat-cell {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
}

.stat-cell span {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.2rem;
}

.stat-cell strong {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ── Quick list ──────────────────────────────────────────────── */
.quick-list {
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.quick-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.72rem;
  font-weight: 500;
}

/* ── Bookmarks ───────────────────────────────────────────────── */
.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.bookmark-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.32rem 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: all 0.15s ease;
}

.bookmark-chip:hover {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}

.bookmark-chip.media-bookmark {
  color: #7fa1c3;
  border-color: rgba(127, 161, 195, 0.2);
  background: rgba(127, 161, 195, 0.05);
}

.bookmark-chip.media-bookmark:hover {
  background: rgba(127, 161, 195, 0.1);
  border-color: rgba(127, 161, 195, 0.3);
}

/* ── SSH list ────────────────────────────────────────────────── */
.ssh-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ssh-row {
  display: flex;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: -0.01em;
}

.ssh-row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
}

/* ── Empty state ─────────────────────────────────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(20, 25, 32, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 1.75rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.empty-title {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: -0.02em;
}

.empty-subtitle {
  margin: 0 0 0.85rem;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.75rem;
}

/* ── Modal ───────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: #0f1419;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  margin: 0.2rem 0 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
}

.modal-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.9);
}

.modal-form {
  padding: 1.25rem;
}
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
}
.form-group {
  margin-bottom: 0.8rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 0.35rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8125rem;
  font-family: inherit;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: rgba(127, 161, 195, 0.5);
}

/* ── Toggle ──────────────────────────────────────────────────── */
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
  transition: 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  transition: 0.2s;
}
input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: #fff;
}
input:checked + .toggle-slider {
  background: rgba(127, 161, 195, 0.6);
  border-color: rgba(127, 161, 195, 0.4);
}

/* ── Form actions ────────────────────────────────────────────── */
.form-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 1rem;
}

.btn {
  flex: 1;
  padding: 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: -0.01em;
  transition: all 0.15s ease;
}

.btn-primary {
  background: rgba(127, 161, 195, 0.15);
  color: #7fa1c3;
  border-color: rgba(127, 161, 195, 0.25);
}

.btn-primary:hover {
  background: rgba(127, 161, 195, 0.25);
  border-color: rgba(127, 161, 195, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75);
}

/* ── Modal transition ────────────────────────────────────────── */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }
  .panel-primary {
    grid-row: auto;
  }
}

@media (max-width: 768px) {
  .dashboard-grid,
  .host-cards,
  .bookmark-grid {
    grid-template-columns: 1fr;
  }

  .top-strip {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
