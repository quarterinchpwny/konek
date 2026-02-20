<template>
  <div class="media-manager">
    <div class="background-layer"></div>
    <div class="grid-overlay"></div>

    <div v-if="!hostId" class="empty-state">
      <div class="empty-card">
        <Icon icon="mdi:television-play" class="empty-icon" />
        <p class="empty-title">No Host Selected</p>
        <p class="empty-text">Select a host to view media services.</p>
      </div>
    </div>

    <div v-else class="main-content">
      <header class="page-header">
        <div>
          <p class="kicker">all systems normal</p>
          <h1 class="page-title">Consumer</h1>
          <p class="page-subtitle">Quick access and media stack telemetry</p>
        </div>
        <button @click="showConfigModal = true" class="config-btn">
          <Icon icon="mdi:cog" />
          <span>Configure</span>
        </button>
      </header>

      <div v-if="isLoadingConfigs" class="loading-container">
        <div class="loader"></div>
        <p>Loading services...</p>
      </div>

      <div v-else-if="!hasAnyConfigured" class="empty-setup">
        <Icon icon="mdi:server-off" class="setup-icon" />
        <h3>No Services Configured</h3>
        <p>Add Sonarr, Radarr, Jellyfin, or Jellyseerr to begin.</p>
        <button @click="showConfigModal = true" class="primary-btn">
          <Icon icon="mdi:plus" />
          Add Service
        </button>
      </div>

      <div v-else class="widgets-grid">
        <section v-if="getConfig('sonarr')?.enabled" class="widget span-two sonarr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:sonarr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Sonarr</h3>
                <span class="widget-status" :class="statusClass('sonarr')">
                  {{ statusText('sonarr') }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('sonarr')?.url" :href="getConfig('sonarr').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-stats">
            <div class="stat-box">
              <span class="stat-label">Series</span>
              <span class="stat-value">{{ libraryCounts.sonarr || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Episodes</span>
              <span class="stat-value">{{ sonarrEpisodes || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Missing</span>
              <span class="stat-value warning">{{ sonarrMissing || 0 }}</span>
            </div>
          </div>

          <div v-if="sonarrQueue.length" class="widget-section">
            <h4 class="section-title">Queue</h4>
            <div class="queue-items">
              <div v-for="item in sonarrQueue.slice(0, 4)" :key="item.id" class="queue-item">
                <div class="queue-info">
                  <span class="queue-title">{{ item.title }}</span>
                  <span class="queue-status-text">{{ item.status }}</span>
                </div>
                <div class="queue-progress">
                  <div class="progress-bar">
                    <div class="progress-fill sonarr" :style="{ width: `${item.progress}%` }"></div>
                  </div>
                  <span class="progress-text">{{ item.progress }}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="getConfig('radarr')?.enabled" class="widget radarr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:radarr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Radarr</h3>
                <span class="widget-status" :class="statusClass('radarr')">
                  {{ statusText('radarr') }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('radarr')?.url" :href="getConfig('radarr').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-stats">
            <div class="stat-box">
              <span class="stat-label">Movies</span>
              <span class="stat-value">{{ libraryCounts.radarr || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Available</span>
              <span class="stat-value success">{{ radarrAvailable || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Missing</span>
              <span class="stat-value warning">{{ radarrMissing || 0 }}</span>
            </div>
          </div>

          <div v-if="radarrUpcoming.length" class="widget-section">
            <h4 class="section-title">Coming Soon</h4>
            <div class="upcoming-items">
              <div v-for="item in radarrUpcoming.slice(0, 5)" :key="item.id" class="upcoming-item">
                <span class="upcoming-title">{{ item.title }}</span>
                <span class="upcoming-date">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="getConfig('jellyseerr')?.enabled" class="widget jellyseerr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:jellyseerr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Jellyseerr</h3>
                <span class="widget-status" :class="statusClass('jellyseerr')">
                  {{ statusText('jellyseerr') }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('jellyseerr')?.url" :href="getConfig('jellyseerr').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-stats">
            <div class="stat-box">
              <span class="stat-label">Pending</span>
              <span class="stat-value warning">{{ jellyseerrPending || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Approved</span>
              <span class="stat-value">{{ jellyseerrApproved || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Available</span>
              <span class="stat-value success">{{ jellyseerrAvailable || 0 }}</span>
            </div>
          </div>

          <div v-if="jellyseerrRequests.length" class="widget-section">
            <h4 class="section-title">Recent Requests</h4>
            <div class="request-items">
              <div v-for="item in jellyseerrRequests.slice(0, 5)" :key="item.id" class="request-item">
                <span class="request-title">{{ item.title }}</span>
                <span class="request-status" :class="item.status.toLowerCase()">{{ item.status }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="getConfig('jellyfin')?.enabled" class="widget span-two jellyfin-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:jellyfin" class="widget-icon" />
              <div>
                <h3 class="widget-title">Jellyfin</h3>
                <span class="widget-status" :class="statusClass('jellyfin')">
                  {{ statusText('jellyfin') }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('jellyfin')?.url" :href="getConfig('jellyfin').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-stats">
            <div class="stat-box">
              <span class="stat-label">Version</span>
              <span class="stat-value small">{{ jellyfinVersion || '-' }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Users</span>
              <span class="stat-value">{{ jellyfinUsers || 0 }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Now Playing</span>
              <span class="stat-value success">{{ jellyfinActive || 0 }}</span>
            </div>
          </div>

          <div v-if="jellyfinNowPlaying.length" class="widget-section">
            <h4 class="section-title">Now Playing</h4>
            <div class="now-playing-items">
              <div v-for="item in jellyfinNowPlaying" :key="item.id" class="now-playing-item">
                <Icon icon="mdi:play-circle" class="play-icon" />
                <div class="play-info">
                  <span class="play-title">{{ item.title }}</span>
                  <span class="play-user">{{ item.user }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showConfigModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Configure Services</h3>
            <button @click="closeModal" class="close-btn">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="modal-body">
            <div class="service-list">
              <div v-for="service in services" :key="service.type" class="service-config-item">
                <div class="service-config-header">
                  <div class="service-info">
                    <Icon :icon="service.icon" class="service-icon-small" :class="service.type" />
                    <span class="service-name">{{ service.name }}</span>
                  </div>
                  <button @click="editService(service.type)" class="edit-btn" :class="{ configured: getConfig(service.type) }">
                    {{ getConfig(service.type) ? 'Edit' : 'Setup' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Configure {{ editingService }}</h3>
            <button @click="showEditModal = false" class="close-btn">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Service URL</label>
              <input v-model="configForm.url" type="text" placeholder="http://192.168.1.100:8989" class="form-input" />
            </div>

            <div class="form-group">
              <label>API Key</label>
              <input v-model="configForm.apiKey" type="password" placeholder="Your API key" class="form-input" />
            </div>

            <div class="form-checkbox-group">
              <input v-model="configForm.enabled" type="checkbox" id="enabled" />
              <label for="enabled">Enable this service</label>
            </div>

            <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
              <Icon :icon="testResult.success ? 'mdi:check-circle' : 'mdi:alert-circle'" />
              {{ testResult.message }}
            </div>
          </div>

          <div class="modal-footer">
            <button @click="testConnection" class="secondary-btn" :disabled="isTestingConnection">
              <Icon :icon="isTestingConnection ? 'mdi:loading' : 'mdi:wifi'" :class="{ spin: isTestingConnection }" />
              Test
            </button>
            <button @click="showEditModal = false" class="secondary-btn">Cancel</button>
            <button @click="saveConfig" class="primary-btn" :disabled="isSaving">
              <Icon :icon="isSaving ? 'mdi:loading' : 'mdi:check'" :class="{ spin: isSaving }" />
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{ hostId?: number }>();

const services = [
  { type: 'sonarr', name: 'Sonarr', icon: 'simple-icons:sonarr' },
  { type: 'radarr', name: 'Radarr', icon: 'simple-icons:radarr' },
  { type: 'jellyfin', name: 'Jellyfin', icon: 'simple-icons:jellyfin' },
  { type: 'jellyseerr', name: 'Jellyseerr', icon: 'simple-icons:jellyseerr' }
];

const configs = ref<any[]>([]);
const statusMap = ref<Record<string, string>>({});
const isLoadingConfigs = ref(true);
const isSaving = ref(false);
const isTestingConnection = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const libraryCounts = ref<Record<string, number>>({ sonarr: 0, radarr: 0 });
const sonarrEpisodes = ref(0);
const sonarrMissing = ref(0);
const sonarrQueue = ref<any[]>([]);
const sonarrUpcoming = ref<any[]>([]);

const radarrAvailable = ref(0);
const radarrMissing = ref(0);
const radarrQueue = ref<any[]>([]);
const radarrUpcoming = ref<any[]>([]);

const jellyfinVersion = ref('');
const jellyfinUsers = ref(0);
const jellyfinActive = ref(0);
const jellyfinNowPlaying = ref<any[]>([]);

const jellyseerrPending = ref(0);
const jellyseerrApproved = ref(0);
const jellyseerrAvailable = ref(0);
const jellyseerrRequests = ref<any[]>([]);

const showConfigModal = ref(false);
const showEditModal = ref(false);
const editingService = ref('');
const configForm = ref({ serviceType: '', url: '', apiKey: '', enabled: true });

const hasAnyConfigured = computed(() => configs.value.length > 0);
const getConfig = (type: string) => configs.value.find(c => c.serviceType === type);
const statusText = (type: string) => (statusMap.value[type] === 'online' ? 'Online' : 'Offline');
const statusClass = (type: string) => (statusMap.value[type] === 'online' ? 'online' : 'offline');

const fetchConfigs = async () => {
  if (!props.hostId) return;
  isLoadingConfigs.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media`);
    if (res.ok) {
      configs.value = await res.json();
      await refreshAll();
    }
  } catch (e) {
    console.error('Failed to fetch configs:', e);
  } finally {
    isLoadingConfigs.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([
    checkAllStatus(),
    fetchSonarrData(),
    fetchRadarrData(),
    fetchJellyfinData(),
    fetchJellyseerrData()
  ]);
};

const checkAllStatus = async () => {
  const pathMap: Record<string, string> = {
    jellyfin: '/System/Info',
    jellyseerr: '/api/v1/status',
    sonarr: '/api/v3/system/status',
    radarr: '/api/v3/system/status'
  };

  await Promise.all(services.map(async (s) => {
    const config = getConfig(s.type);
    if (!config?.enabled) {
      statusMap.value[s.type] = 'disabled';
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/${s.type}${pathMap[s.type]}`,
        { signal: AbortSignal.timeout(5000) }
      );
      statusMap.value[s.type] = res.ok ? 'online' : 'offline';
    } catch {
      statusMap.value[s.type] = 'offline';
    }
  }));
};

const fetchSonarrData = async () => {
  const config = getConfig('sonarr');
  if (!config?.enabled) return;

  try {
    const seriesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/series`);
    if (seriesRes.ok) {
      const series = await seriesRes.json();
      libraryCounts.value.sonarr = series.length;
      sonarrEpisodes.value = series.reduce((sum: number, s: any) => sum + (s.statistics?.episodeFileCount || 0), 0);
    }

    const missingRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/wanted/missing?pageSize=1`);
    if (missingRes.ok) {
      const missing = await missingRes.json();
      sonarrMissing.value = missing.totalRecords || 0;
    }

    const queueRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/queue`);
    if (queueRes.ok) {
      const queue = await queueRes.json();
      sonarrQueue.value = (queue.records || []).map((r: any) => ({
        id: r.id,
        title: r.title || 'Unknown',
        status: r.status || 'Downloading',
        progress: r.sizeleft === 0 ? 100 : Math.round(((r.size - r.sizeleft) / r.size) * 100)
      }));
    }

    const start = new Date();
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const calendarRes = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/calendar?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`
    );
    if (calendarRes.ok) {
      const calendar = await calendarRes.json();
      sonarrUpcoming.value = calendar.slice(0, 5).map((r: any) => ({
        id: r.id,
        title: `${r.series?.title} S${r.seasonNumber}E${r.episodeNumber}`,
        date: new Date(r.airDate).toLocaleDateString()
      }));
    }
  } catch (e) {
    console.error('Sonarr fetch error:', e);
  }
};

const fetchRadarrData = async () => {
  const config = getConfig('radarr');
  if (!config?.enabled) return;

  try {
    const moviesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/radarr/api/v3/movie`);
    if (moviesRes.ok) {
      const movies = await moviesRes.json();
      libraryCounts.value.radarr = movies.length;
      radarrAvailable.value = movies.filter((m: any) => m.hasFile).length;
      radarrMissing.value = movies.filter((m: any) => !m.hasFile && m.monitored).length;
    }

    const queueRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/radarr/api/v3/queue`);
    if (queueRes.ok) {
      const queue = await queueRes.json();
      radarrQueue.value = (queue.records || []).map((r: any) => ({
        id: r.id,
        title: r.title || 'Unknown',
        status: r.status || 'Downloading',
        progress: r.sizeleft === 0 ? 100 : Math.round(((r.size - r.sizeleft) / r.size) * 100)
      }));
    }

    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const calendarRes = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/radarr/api/v3/calendar?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`
    );
    if (calendarRes.ok) {
      const calendar = await calendarRes.json();
      radarrUpcoming.value = calendar.slice(0, 5).map((r: any) => ({
        id: r.id,
        title: r.title,
        date: new Date(r.inCinemas || r.physicalRelease).toLocaleDateString()
      }));
    }
  } catch (e) {
    console.error('Radarr fetch error:', e);
  }
};

const fetchJellyfinData = async () => {
  const config = getConfig('jellyfin');
  if (!config?.enabled) return;

  try {
    const infoRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/jellyfin/System/Info`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      jellyfinVersion.value = info.Version || '';
    }

    const sessionsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/jellyfin/Sessions`);
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      jellyfinUsers.value = sessions.length;
      jellyfinActive.value = sessions.filter((s: any) => s.NowPlayingItem).length;
      jellyfinNowPlaying.value = sessions
        .filter((s: any) => s.NowPlayingItem)
        .map((s: any) => ({
          id: s.Id,
          title: s.NowPlayingItem.Name,
          user: s.UserName
        }));
    }
  } catch (e) {
    console.error('Jellyfin fetch error:', e);
  }
};

const fetchJellyseerrData = async () => {
  const config = getConfig('jellyseerr');
  if (!config?.enabled) return;

  try {
    const requestsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/jellyseerr/api/v1/request?take=20&skip=0`);
    if (requestsRes.ok) {
      const data = await requestsRes.json();
      const requests = data.results || [];

      jellyseerrPending.value = requests.filter((r: any) => r.status === 1).length;
      jellyseerrApproved.value = requests.filter((r: any) => r.status === 2).length;
      jellyseerrAvailable.value = requests.filter((r: any) => r.status === 3).length;

      jellyseerrRequests.value = requests.slice(0, 5).map((r: any) => ({
        id: r.id,
        title: r.media?.title || 'Unknown',
        status: r.status === 1 ? 'Pending' : r.status === 2 ? 'Approved' : 'Available'
      }));
    }
  } catch (e) {
    console.error('Jellyseerr fetch error:', e);
  }
};

const editService = (type: string) => {
  const existing = getConfig(type);
  editingService.value = type;
  configForm.value = {
    serviceType: type,
    url: existing?.url || '',
    apiKey: existing?.apiKey || '',
    enabled: existing ? !!existing.enabled : true
  };
  showConfigModal.value = false;
  showEditModal.value = true;
  testResult.value = null;
};

const closeModal = () => {
  showConfigModal.value = false;
  showEditModal.value = false;
  testResult.value = null;
};

const testConnection = async () => {
  if (!configForm.value.url || !configForm.value.apiKey) {
    testResult.value = { success: false, message: 'URL and API Key required' };
    return;
  }

  isTestingConnection.value = true;
  testResult.value = null;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType: configForm.value.serviceType,
        url: configForm.value.url,
        apiKey: configForm.value.apiKey
      })
    });
    testResult.value = await res.json();
  } catch {
    testResult.value = { success: false, message: 'Connection failed' };
  } finally {
    isTestingConnection.value = false;
  }
};

const saveConfig = async () => {
  if (!configForm.value.url) {
    alert('URL is required');
    return;
  }

  isSaving.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configForm.value)
    });

    if (res.ok) {
      await fetchConfigs();
      closeModal();
    }
  } catch (e) {
    console.error('Save error:', e);
  } finally {
    isSaving.value = false;
  }
};

let intervalId: any = null;

onMounted(() => {
  if (props.hostId) {
    fetchConfigs();
    intervalId = setInterval(refreshAll, 30000);
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(() => props.hostId, (newId) => {
  if (newId) {
    fetchConfigs();
    if (!intervalId) intervalId = setInterval(refreshAll, 30000);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.media-manager {
  position: relative;
  width: 100%;
  height: 100%;
  color: #d1d8e6;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.background-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0f141c 0%, #111827 100%);
}

.grid-overlay {
  display: none;
}

.main-content {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  padding: 0.95rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(20, 25, 33, 0.92);
  padding: 0.8rem;
  border-radius: 10px;
}

.kicker {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
}

.page-title {
  margin: 0.2rem 0;
  color: #f3f4f6;
  font-size: 1.3rem;
}

.page-subtitle {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: rgba(229, 231, 235, 0.65);
}

.config-btn,
.primary-btn,
.secondary-btn,
.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(31, 41, 55, 0.88);
  color: #e5e7eb;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  font-weight: 600;
  padding: 0.48rem 0.75rem;
  cursor: pointer;
  border-radius: 8px;
}

.config-btn:hover,
.primary-btn:hover,
.secondary-btn:hover,
.edit-btn:hover {
  border-color: rgba(96, 165, 250, 0.7);
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.widget {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(17, 24, 39, 0.9);
  padding: 0.75rem;
  min-height: 210px;
  border-radius: 12px;
}

.widget.span-two {
  grid-column: span 2;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.widget-title-group {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.widget-icon {
  font-size: 20px;
  margin-top: 0.1rem;
}

.widget-title {
  margin: 0;
  color: #f3f4f6;
  letter-spacing: 0.02em;
  font-size: 0.82rem;
}

.widget-status {
  font-family: 'Inter', sans-serif;
  text-transform: capitalize;
  letter-spacing: 0.01em;
  font-size: 0.62rem;
}

.widget-status.online {
  color: #10b981;
}

.widget-status.offline {
  color: #ef4444;
}

.widget-link {
  color: #94a3b8;
}

.widget-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stat-box {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.66);
  padding: 0.45rem;
  border-radius: 8px;
}

.stat-label {
  display: block;
  color: #94a3b8;
  font-family: 'Inter', sans-serif;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  display: block;
  color: #f3f4f6;
  font-weight: 700;
  font-size: 1.2rem;
}

.stat-value.small {
  font-size: 0.85rem;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.success {
  color: #10b981;
}

.widget-section {
  margin-top: 0.7rem;
}

.section-title {
  margin: 0 0 0.45rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Inter', sans-serif;
  font-size: 0.6rem;
}

.queue-items,
.upcoming-items,
.request-items,
.now-playing-items {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.queue-item,
.upcoming-item,
.request-item,
.now-playing-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.66);
  padding: 0.42rem 0.5rem;
  border-radius: 8px;
}

.queue-info,
.upcoming-item,
.request-item {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.queue-title,
.upcoming-title,
.request-title,
.play-title {
  color: #e5e7eb;
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-status-text,
.upcoming-date,
.play-user {
  color: #9ca3af;
  font-size: 0.63rem;
  white-space: nowrap;
}

.queue-progress {
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
}

.progress-fill.sonarr {
  background: linear-gradient(90deg, #06b6d4, #10b981);
}

.progress-text {
  font-size: 0.58rem;
  color: #9ca3af;
}

.play-icon {
  font-size: 18px;
  color: #10b981;
}

.play-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.request-status {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid transparent;
  padding: 0.1rem 0.35rem;
}

.request-status.pending {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
}

.request-status.approved {
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.4);
}

.request-status.available {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
}

.sonarr-widget .widget-icon {
  color: #06b6d4;
}

.radarr-widget .widget-icon {
  color: #60a5fa;
}

.jellyfin-widget .widget-icon {
  color: #3b82f6;
}

.jellyseerr-widget .widget-icon {
  color: #10b981;
}

.loading-container,
.empty-setup,
.empty-state {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 88px);
  gap: 0.65rem;
  text-align: center;
}

.empty-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(17, 24, 39, 0.9);
  padding: 1.4rem;
  border-radius: 12px;
}

.empty-icon,
.setup-icon {
  font-size: 54px;
  color: #60a5fa;
}

.empty-title {
  margin: 0.3rem 0 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.empty-text {
  margin: 0;
  color: #9ca3af;
}

.loader {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 7, 17, 0.82);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 1rem;
}

.modal-content {
  width: min(560px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #111827;
  border-radius: 12px;
}

.modal-header,
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-footer {
  border-bottom: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  justify-content: flex-end;
}

.modal-header h3 {
  margin: 0;
  letter-spacing: 0.02em;
  font-size: 0.82rem;
}

.modal-body {
  padding: 0.85rem;
  overflow-y: auto;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(31, 41, 55, 0.88);
  color: #e5e7eb;
  cursor: pointer;
  border-radius: 6px;
}

.service-list {
  display: grid;
  gap: 0.5rem;
}

.service-config-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.66);
  padding: 0.6rem;
  border-radius: 8px;
}

.service-config-header,
.service-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.service-icon-small {
  font-size: 18px;
}

.service-icon-small.sonarr { color: #47f5da; }
.service-icon-small.radarr { color: #60a5fa; }
.service-icon-small.jellyfin { color: #3b82f6; }
.service-icon-small.jellyseerr { color: #10b981; }

.service-name {
  font-size: 0.74rem;
  letter-spacing: 0.02em;
}

.edit-btn.configured {
  border-color: rgba(59, 130, 246, 0.55);
  color: #60a5fa;
}

.form-group {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.8rem;
}

.form-group label,
.form-checkbox-group label {
  font-size: 0.68rem;
  color: #cbd5e1;
  letter-spacing: 0.02em;
}

.form-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(30, 41, 59, 0.85);
  color: #f1f5f9;
  padding: 0.5rem 0.6rem;
  outline: none;
  border-radius: 8px;
}

.form-input:focus {
  border-color: rgba(96, 165, 250, 0.7);
}

.form-checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.test-result {
  margin-top: 0.6rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid;
  font-size: 0.7rem;
}

.test-result.success {
  border-color: rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.test-result.error {
  border-color: rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.spin {
  animation: spin 1s linear infinite;
}

.main-content::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
}

@media (max-width: 980px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }

  .widget.span-two {
    grid-column: span 1;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
