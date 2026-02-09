<template>
  <div class="media-manager">
    <!-- Background -->
    <div class="background-layer"></div>
    <div class="noise-overlay"></div>

    <!-- No host -->
    <div v-if="!hostId" class="empty-state">
      <div class="empty-card">
        <Icon icon="mdi:television-play" class="empty-icon" />
        <p class="empty-text">Select a host to view media services</p>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="main-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <Icon icon="mdi:television-play" class="header-icon" />
          <div>
            <h1 class="page-title">Media Services</h1>
            <p class="page-subtitle">Monitor your *arr stack and media server</p>
          </div>
        </div>
        <button @click="showConfigModal = true" class="config-btn">
          <Icon icon="mdi:cog" />
          <span>Configure</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingConfigs" class="loading-container">
        <div class="loader"></div>
        <p>Loading services...</p>
      </div>

      <!-- No services configured -->
      <div v-else-if="!hasAnyConfigured" class="empty-setup">
        <Icon icon="mdi:server-off" class="setup-icon" />
        <h3>No Services Configured</h3>
        <p>Add your Sonarr, Radarr, Jellyfin, or Jellyseerr instances</p>
        <button @click="showConfigModal = true" class="primary-btn">
          <Icon icon="mdi:plus" />
          Add Service
        </button>
      </div>

      <!-- Widgets Grid -->
      <div v-else class="widgets-grid">
        <!-- Sonarr Widget -->
        <div v-if="getConfig('sonarr')?.enabled" class="widget sonarr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:sonarr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Sonarr</h3>
                <span class="widget-status" :class="statusMap.sonarr">
                  {{ statusMap.sonarr === 'online' ? 'Connected' : 'Offline' }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('sonarr')?.url" :href="getConfig('sonarr').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-content">
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
              <h4 class="section-title">Queue ({{ sonarrQueue.length }})</h4>
              <div class="queue-items">
                <div v-for="item in sonarrQueue.slice(0, 3)" :key="item.id" class="queue-item">
                  <div class="queue-info">
                    <span class="queue-title">{{ item.title }}</span>
                    <span class="queue-status">{{ item.status }}</span>
                  </div>
                  <div class="queue-progress">
                    <div class="progress-bar">
                      <div class="progress-fill sonarr" :style="{ width: item.progress + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ item.progress }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="sonarrUpcoming.length" class="widget-section">
              <h4 class="section-title">Upcoming</h4>
              <div class="upcoming-items">
                <div v-for="item in sonarrUpcoming.slice(0, 3)" :key="item.id" class="upcoming-item">
                  <span class="upcoming-title">{{ item.title }}</span>
                  <span class="upcoming-date">{{ item.date }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Radarr Widget -->
        <div v-if="getConfig('radarr')?.enabled" class="widget radarr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:radarr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Radarr</h3>
                <span class="widget-status" :class="statusMap.radarr">
                  {{ statusMap.radarr === 'online' ? 'Connected' : 'Offline' }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('radarr')?.url" :href="getConfig('radarr').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-content">
            <div class="widget-stats">
              <div class="stat-box">
                <span class="stat-label">Movies</span>
                <span class="stat-value">{{ libraryCounts.radarr || 0 }}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Available</span>
                <span class="stat-value">{{ radarrAvailable || 0 }}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Missing</span>
                <span class="stat-value warning">{{ radarrMissing || 0 }}</span>
              </div>
            </div>

            <div v-if="radarrQueue.length" class="widget-section">
              <h4 class="section-title">Queue ({{ radarrQueue.length }})</h4>
              <div class="queue-items">
                <div v-for="item in radarrQueue.slice(0, 3)" :key="item.id" class="queue-item">
                  <div class="queue-info">
                    <span class="queue-title">{{ item.title }}</span>
                    <span class="queue-status">{{ item.status }}</span>
                  </div>
                  <div class="queue-progress">
                    <div class="progress-bar">
                      <div class="progress-fill radarr" :style="{ width: item.progress + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ item.progress }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="radarrUpcoming.length" class="widget-section">
              <h4 class="section-title">Coming Soon</h4>
              <div class="upcoming-items">
                <div v-for="item in radarrUpcoming.slice(0, 3)" :key="item.id" class="upcoming-item">
                  <span class="upcoming-title">{{ item.title }}</span>
                  <span class="upcoming-date">{{ item.date }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Jellyfin Widget -->
        <div v-if="getConfig('jellyfin')?.enabled" class="widget jellyfin-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:jellyfin" class="widget-icon" />
              <div>
                <h3 class="widget-title">Jellyfin</h3>
                <span class="widget-status" :class="statusMap.jellyfin">
                  {{ statusMap.jellyfin === 'online' ? 'Connected' : 'Offline' }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('jellyfin')?.url" :href="getConfig('jellyfin').url" target="_blank" class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-content">
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
                <span class="stat-label">Active</span>
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
          </div>
        </div>

        <!-- Jellyseerr Widget -->
        <div v-if="getConfig('jellyseerr')?.enabled" class="widget jellyseerr-widget">
          <div class="widget-header">
            <div class="widget-title-group">
              <Icon icon="simple-icons:jellyseerr" class="widget-icon" />
              <div>
                <h3 class="widget-title">Jellyseerr</h3>
                <span class="widget-status" :class="statusMap.jellyseerr">
                  {{ statusMap.jellyseerr === 'online' ? 'Connected' : 'Offline' }}
                </span>
              </div>
            </div>
            <a v-if="getConfig('jellyseerr')?.url" :href="getConfig('jellyseerr').url" target="_blank"
              class="widget-link">
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>

          <div class="widget-content">
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
                <div v-for="item in jellyseerrRequests.slice(0, 4)" :key="item.id" class="request-item">
                  <span class="request-title">{{ item.title }}</span>
                  <span class="request-status" :class="item.status.toLowerCase()">{{ item.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Config Modal -->
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
                  <button @click="editService(service.type)" class="edit-btn"
                    :class="{ configured: getConfig(service.type) }">
                    {{ getConfig(service.type) ? 'Edit' : 'Setup' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Edit Modal -->
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

// Sonarr data
const libraryCounts = ref<Record<string, number>>({ sonarr: 0, radarr: 0 });
const sonarrEpisodes = ref(0);
const sonarrMissing = ref(0);
const sonarrQueue = ref<any[]>([]);
const sonarrUpcoming = ref<any[]>([]);

// Radarr data
const radarrAvailable = ref(0);
const radarrMissing = ref(0);
const radarrQueue = ref<any[]>([]);
const radarrUpcoming = ref<any[]>([]);

// Jellyfin data
const jellyfinVersion = ref('');
const jellyfinUsers = ref(0);
const jellyfinActive = ref(0);
const jellyfinNowPlaying = ref<any[]>([]);

// Jellyseerr data
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
    // Series count
    const seriesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/series`);
    if (seriesRes.ok) {
      const series = await seriesRes.json();
      libraryCounts.value.sonarr = series.length;
      sonarrEpisodes.value = series.reduce((sum: number, s: any) => sum + (s.statistics?.episodeFileCount || 0), 0);
    }

    // Missing count
    const missingRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/sonarr/api/v3/wanted/missing?pageSize=1`);
    if (missingRes.ok) {
      const missing = await missingRes.json();
      sonarrMissing.value = missing.totalRecords || 0;
    }

    // Queue
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

    // Upcoming
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
    // Movies
    const moviesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/radarr/api/v3/movie`);
    if (moviesRes.ok) {
      const movies = await moviesRes.json();
      libraryCounts.value.radarr = movies.length;
      radarrAvailable.value = movies.filter((m: any) => m.hasFile).length;
      radarrMissing.value = movies.filter((m: any) => !m.hasFile && m.monitored).length;
    }

    // Queue
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

    // Upcoming
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
    // System info
    const infoRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hosts/${props.hostId}/media/proxy/jellyfin/System/Info`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      jellyfinVersion.value = info.Version || '';
    }

    // Sessions (active users)
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
  font-family: 'Inter', sans-serif;
  color: #e5e7eb;
  overflow: hidden;
}

.background-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #0f1419 0%, #1a1f26 100%);
  z-index: 0;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

.empty-state {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-card {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.empty-icon {
  font-size: 64px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 1rem;
}

.empty-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.95rem;
}

.main-content {
  position: relative;
  z-index: 2;
  height: 100%;
  padding: 2rem;
  overflow-y: auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  font-size: 28px;
  color: #3b82f6;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #f9fafb;
}

.page-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0.25rem 0 0 0;
}

.config-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e5e7eb;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.config-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  gap: 1rem;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty Setup */
.empty-setup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  text-align: center;
  gap: 1rem;
}

.setup-icon {
  font-size: 64px;
  color: rgba(255, 255, 255, 0.2);
}

.empty-setup h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #f9fafb;
}

.empty-setup p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* Buttons */
.primary-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.primary-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.secondary-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e5e7eb;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.secondary-btn:disabled,
.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Widgets Grid */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

/* Widget Card */
.widget {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.widget:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.widget-title-group {
  display: flex;
  gap: 0.75rem;
}

.widget-icon {
  font-size: 24px;
  margin-top: 0.25rem;
}

.sonarr-widget .widget-icon {
  color: #00bcd4;
}

.radarr-widget .widget-icon {
  color: #ffc107;
}

.jellyfin-widget .widget-icon {
  color: #00a4d9;
}

.jellyseerr-widget .widget-icon {
  color: #e11d48;
}

.widget-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: #f9fafb;
}

.widget-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.widget-status.online {
  color: #10b981;
}

.widget-status.offline {
  color: #ef4444;
}

.widget-link {
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s;
}

.widget-link:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* Widget Stats */
.widget-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-box {
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f9fafb;
}

.stat-value.small {
  font-size: 1rem;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.success {
  color: #10b981;
}

/* Widget Sections */
.widget-section {
  margin-bottom: 1.5rem;
}

.widget-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 0.75rem 0;
}

/* Queue Items */
.queue-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: 8px;
}

.queue-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.queue-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.queue-status {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 1rem;
}

.queue-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-fill.sonarr {
  background: #00bcd4;
}

.progress-fill.radarr {
  background: #ffc107;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  min-width: 35px;
  text-align: right;
}

/* Upcoming Items */
.upcoming-items,
.request-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upcoming-item,
.request-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.upcoming-title,
.request-title {
  font-size: 0.875rem;
  color: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.upcoming-date {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 1rem;
}

.request-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.request-status.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.request-status.approved {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.request-status.available {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/* Now Playing */
.now-playing-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.now-playing-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.play-icon {
  font-size: 20px;
  color: #10b981;
}

.play-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.play-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f9fafb;
}

.play-user {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: #1a1f26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: #f9fafb;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
}

.modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Service List */
.service-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.service-config-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem;
}

.service-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.service-icon-small {
  font-size: 20px;
}

.service-icon-small.sonarr {
  color: #00bcd4;
}

.service-icon-small.radarr {
  color: #ffc107;
}

.service-icon-small.jellyfin {
  color: #00a4d9;
}

.service-icon-small.jellyseerr {
  color: #e11d48;
}

.service-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #f9fafb;
}

.edit-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e5e7eb;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.edit-btn.configured {
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Form */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #f9fafb;
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #3b82f6;
  background: rgba(0, 0, 0, 0.4);
}

.form-checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.form-checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-checkbox-group label {
  font-size: 0.9375rem;
  color: #e5e7eb;
  cursor: pointer;
  user-select: none;
}

.test-result {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.test-result.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.spin {
  animation: spin 1s linear infinite;
}

/* Scrollbar */
.main-content::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.main-content::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .widgets-grid {
    grid-template-columns: 1fr;
  }

  .widget-stats {
    grid-template-columns: 1fr;
  }
}
</style>