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
import { useRouter } from "vue-router";
import { useHostStore, type Host } from "@/stores/hostStore";
import RecentActivity from "@/components/RecentActivity.vue";
import {
  Plus,
  Server,
  Trash2,
  X,
  Zap,
  Pencil,
  Bookmark,
  ExternalLink,
} from "lucide-vue-next";

const props = defineProps<{
  embedded?: boolean;
}>();

const hostStore = useHostStore();
const router = useRouter();

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

const clamp = (val?: number) =>
  Math.min(100, Math.max(0, Math.round(val || 0)));

const statusClass = (status?: Host["status"]) => {
  if (status === "online") return "ok";
  if (status === "offline") return "off";
  if (status === "error") return "err";
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
  if (!props.embedded) {
    await router.push({ name: "dashboard" });
  }
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
@reference "../assets/css/main.css";

.home-page {
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: #d4d9e6;
  @apply relative h-full w-full overflow-hidden;
}

.home-page.embedded {
  background: transparent;
}

.home-page.embedded .home-shell {
  @apply p-0;
}

.home-bg {
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  @apply absolute inset-0 z-0;
}

.home-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  @apply absolute inset-0 z-[1];
}

.home-shell {
  @apply relative z-[2] flex h-full flex-col gap-[0.65rem] p-[0.65rem];
}

.top-strip {
  background: rgba(20, 25, 32, 0.8);
  @apply flex items-center justify-between rounded-[10px] border border-white/6 px-3 py-[0.35rem];
}

.top-nav {
  background: rgba(30, 35, 42, 0.4);
  @apply flex gap-1 rounded-lg border border-white/6 p-[0.2rem];
}

.top-nav-item {
  font-family: inherit;
  @apply cursor-pointer rounded-md border-none bg-transparent px-[0.65rem] py-[0.35rem] text-xs font-semibold tracking-[-0.01em] text-white/50 transition-all duration-200;
}

.top-nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
  @apply text-white/80;
}

.top-nav-item.active {
  background: rgba(127, 161, 195, 0.12);
  @apply text-[#7fa1c3];
}

.top-meta {
  font-size: 0.72rem;
  font-family: "JetBrains Mono", monospace;
  @apply font-medium tracking-[-0.01em] text-white/40;
}

.page-header {
  @apply flex items-center justify-between px-[0.1rem] py-[0.45rem];
}

.header-label {
  @apply m-0 text-[0.66rem] font-medium uppercase tracking-[0.08em] text-white/40;
}

.header-title {
  @apply m-0 mt-[0.2rem] text-[1.08rem] font-bold tracking-[-0.02em] text-white/90;
}

.add-host-btn {
  background: rgba(127, 161, 195, 0.12);
  font-family: inherit;
  @apply inline-flex cursor-pointer items-center gap-[0.4rem] rounded-lg border border-white/10 px-[0.85rem] py-2 text-xs font-semibold tracking-[-0.01em] text-[#7fa1c3] transition-all duration-200;
}

.add-host-btn:hover {
  background: rgba(127, 161, 195, 0.2);
  @apply border-[#7fa1c3]/30;
}

.dashboard-grid {
  grid-auto-rows: minmax(min-content, max-content);
  @apply grid min-h-0 flex-1 grid-cols-4 gap-[0.65rem];
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

.panel {
  background: rgba(20, 25, 32, 0.8);
  @apply min-h-0 overflow-auto rounded-[10px] border border-white/6 p-3 backdrop-blur-[8px] transition-colors duration-200;
}

.panel:hover {
  @apply border-white/10;
}

.panel-activity {
  grid-column: span 2;
}

.panel-head {
  @apply mb-[0.6rem] flex items-center justify-between;
}

.panel-head h3 {
  @apply m-0 text-[0.8125rem] font-semibold tracking-[-0.01em] text-white/90;
}

.muted {
  @apply text-[0.72rem] text-white/40;
}

.mini-status.ok {
  background: rgba(139, 213, 168, 0.08);
  @apply border-[#8bd5a8]/35 text-[#8bd5a8];
}
.mini-status.off {
  background: rgba(242, 180, 180, 0.08);
  @apply border-[#f2b4b4]/35 text-[#f2b4b4];
}
.mini-status.err {
  background: rgba(242, 207, 141, 0.08);
  @apply border-[#f2cf8d]/35 text-[#f2cf8d];
}
.mini-status.unknown {
  @apply border-white/12 text-white/40;
}

.host-cards {
  @apply grid grid-cols-2 gap-[0.45rem];
}

.mini-host-card {
  background: rgba(255, 255, 255, 0.02);
  @apply rounded-lg border border-white/6 p-2 transition-colors duration-200;
}

.mini-host-card:hover {
  @apply border-white/10;
}

.mini-head {
  @apply flex items-center justify-between text-[0.72rem] font-semibold tracking-[-0.01em] text-white/80;
}

.mini-status {
  @apply h-[7px] w-[7px] rounded-full border;
}

.mini-meta {
  font-family: "JetBrains Mono", monospace;
  @apply my-[0.2rem] text-[0.65rem] text-white/35;
}

.mini-meter {
  background: rgba(255, 255, 255, 0.06);
  @apply h-[3px] overflow-hidden rounded;
}

.mini-fill {
  height: 100%;
  background: linear-gradient(to right, #7fa1c3, #a3c4e8);
  transition: width 0.4s ease;
  @apply rounded;
}

.mini-actions {
  @apply mt-[0.4rem] flex gap-1;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.02);
  @apply inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/8 text-white/50 transition-all duration-150;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  @apply border-white/14 text-white/80;
}

.icon-btn.danger {
  @apply text-[#f2b4b4]/60;
}
.icon-btn.danger:hover {
  background: rgba(242, 180, 180, 0.08);
  @apply border-[#f2b4b4]/20 text-[#f2b4b4];
}

.bookmark-grid {
  @apply grid grid-cols-2 gap-[0.35rem];
}

.bookmark-chip {
  background: rgba(255, 255, 255, 0.02);
  @apply inline-flex items-center gap-[0.3rem] rounded-md border border-white/6 px-[0.45rem] py-[0.32rem] text-[0.7rem] font-medium tracking-[-0.01em] text-white/60 no-underline transition-all duration-150;
}

.bookmark-chip:hover {
  background: rgba(255, 255, 255, 0.05);
  @apply border-white/12 text-white/85;
}

.bookmark-chip.media-bookmark {
  background: rgba(127, 161, 195, 0.05);
  @apply border-[#7fa1c3]/20 text-[#7fa1c3];
}

.bookmark-chip.media-bookmark:hover {
  background: rgba(127, 161, 195, 0.1);
  @apply border-[#7fa1c3]/30;
}

.empty-state {
  @apply flex flex-1 items-center justify-center;
}

.empty-card {
  background: rgba(20, 25, 32, 0.8);
  @apply rounded-xl border border-white/6 p-7 text-center text-white/60 backdrop-blur-[12px];
}

.empty-title {
  @apply m-0 mb-[0.25rem] mt-2 text-[0.9rem] font-semibold tracking-[-0.02em] text-white/80;
}

.empty-subtitle {
  @apply m-0 mb-[0.85rem] text-xs text-white/35;
}

.modal-overlay {
  background: rgba(0, 0, 0, 0.75);
  @apply fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm;
}

.modal-content {
  @apply w-full max-w-[480px] overflow-hidden rounded-xl border border-white/10 bg-[#0f1419];
}

.modal-header {
  @apply flex items-start justify-between border-b border-white/6 px-5 py-4;
}

.modal-title {
  @apply m-0 text-base font-bold tracking-[-0.02em] text-white/90;
}

.modal-subtitle {
  @apply m-0 mt-[0.2rem] text-xs text-white/40;
}

.modal-close {
  background: rgba(255, 255, 255, 0.03);
  @apply inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/8 text-white/60 transition-all duration-150;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.07);
  @apply text-white/90;
}

.modal-form {
  @apply p-5;
}
.form-row {
  @apply mb-[0.85rem] flex items-center justify-between;
}
.form-group {
  @apply mb-[0.8rem];
}
.form-grid {
  @apply mb-[0.8rem] grid grid-cols-[2fr_1fr] gap-[0.6rem];
}
.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  @apply mb-[0.35rem] block text-[0.7rem] font-semibold uppercase tracking-[0.02em] text-white/50;
}

.form-input {
  background: rgba(255, 255, 255, 0.04);
  font-family: inherit;
  box-sizing: border-box;
  @apply w-full rounded-lg border border-white/10 px-3 py-[0.6rem] text-[0.8125rem] text-white/90 transition-colors duration-150;
}

.form-input:focus {
  @apply border-[#7fa1c3]/50 outline-none;
}

.toggle-switch {
  @apply relative inline-block h-6 w-11 cursor-pointer;
}
.toggle-switch input {
  @apply h-0 w-0 opacity-0;
}
.toggle-slider {
  background: rgba(255, 255, 255, 0.1);
  @apply absolute inset-0 rounded-xl border border-white/8 transition-all duration-200;
}
.toggle-slider::before {
  content: "";
  background: rgba(255, 255, 255, 0.6);
  @apply absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-all duration-200;
}
input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: #fff;
}
input:checked + .toggle-slider {
  background: rgba(127, 161, 195, 0.6);
  @apply border-[#7fa1c3]/40;
}

.form-actions {
  @apply mt-4 flex gap-[0.6rem];
}

.btn {
  font-family: inherit;
  @apply flex-1 cursor-pointer rounded-lg border border-white/10 p-[0.65rem] text-[0.8125rem] font-semibold tracking-[-0.01em] transition-all duration-150;
}

.btn-primary {
  background: rgba(127, 161, 195, 0.15);
  @apply border-[#7fa1c3]/25 text-[#7fa1c3];
}

.btn-primary:hover {
  background: rgba(127, 161, 195, 0.25);
  @apply border-[#7fa1c3]/40;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.03);
  @apply text-white/50;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  @apply text-white/75;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }
}

@media (max-width: 768px) {
  .dashboard-grid,
  .host-cards,
  .bookmark-grid {
    grid-template-columns: 1fr;
  }

  .top-strip {
    @apply flex-col items-start gap-[0.4rem];
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
