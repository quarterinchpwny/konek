<template>
  <div class="media-manager">
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
          <p class="kicker">{{ healthKicker }}</p>
          <h1 class="page-title">Consumer</h1>
          <p class="page-subtitle">
            Quick access and media stack telemetry · {{ lastRefreshLabel }}
          </p>
        </div>
        <div class="header-actions">
          <button
            class="config-btn"
            :disabled="isRefreshing"
            @click="refreshNow"
          >
            <Icon icon="mdi:refresh" :class="{ spin: isRefreshing }" />
            <span>{{ isRefreshing ? "Refreshing" : "Refresh" }}</span>
          </button>
          <button class="config-btn" @click="openModal">
            <Icon icon="mdi:cog" />
            <span>Configure</span>
          </button>
        </div>
      </header>

      <div v-if="isLoadingConfigs" class="state-panel">
        <div class="loader"></div>
        <p>Loading services...</p>
      </div>
      <div v-else-if="dashboardError" class="state-panel">
        <Icon icon="mdi:alert-octagon-outline" class="empty-icon" />
        <h3>Media dashboard unavailable</h3>
        <p class="empty-text">{{ dashboardError }}</p>
        <button class="config-btn" @click="refreshNow">Retry</button>
      </div>
      <div v-else-if="!hasAnyConfigured" class="state-panel">
        <Icon icon="mdi:server-off" class="empty-icon" />
        <h3>No Services Configured</h3>
        <p class="empty-text">
          Add Sonarr, Radarr, Jellyfin, Jellyseerr, Prowlarr, or qBittorrent to
          begin.
        </p>
        <button class="config-btn" @click="openModal">
          <Icon icon="mdi:plus" />Add Service
        </button>
      </div>

      <div v-else class="widgets-grid">
        <ArrScheduleWidget
          class="calendar-card span-two"
          :entries="combinedSchedule"
          :loading="isRefreshing"
        />
        <DownloadClientWidget
          v-if="configsByService.qbittorrent?.enabled"
          :config-url="configsByService.qbittorrent?.url"
          :status-class="runtimeMap.qbittorrent.state"
          :status-text="statusText('qbittorrent')"
          :meta="serviceMeta('qbittorrent')"
          :active="downloadActive"
          :download-speed="downloadSpeed"
          :upload-speed="uploadSpeed"
          :items="downloads"
        />
        <ProwlarrWidget
          v-if="configsByService.prowlarr?.enabled"
          :config-url="configsByService.prowlarr?.url"
          :status-class="runtimeMap.prowlarr.state"
          :status-text="statusText('prowlarr')"
          :meta="serviceMeta('prowlarr')"
          :total="indexerTotal"
          :healthy="indexerHealthy"
          :failing="indexerFailing"
          :indexers="indexers"
        />
        <SonarrWidget
          v-if="configsByService.sonarr?.enabled"
          class="span-two"
          :config-url="configsByService.sonarr?.url"
          :status-class="runtimeMap.sonarr.state"
          :status-text="statusText('sonarr')"
          :meta="serviceMeta('sonarr')"
          :series-count="seriesCount"
          :episode-count="episodeCount"
          :missing-count="sonarrMissingCount"
          :queue="queue"
        />
        <RequestsFeedWidget class="span-two" :requests="requestFeed" />
        <ArrHealthWidget class="span-two" :items="arrHealth" />
        <RadarrWidget
          v-if="configsByService.radarr?.enabled"
          :config-url="configsByService.radarr?.url"
          :status-class="runtimeMap.radarr.state"
          :status-text="statusText('radarr')"
          :meta="serviceMeta('radarr')"
          :movie-count="movieCount"
          :available-count="radarrAvailableCount"
          :missing-count="radarrMissingCount"
        />
        <JellyfinWidget
          v-if="configsByService.jellyfin?.enabled"
          class="span-two"
          :config-url="configsByService.jellyfin?.url"
          :status-class="runtimeMap.jellyfin.state"
          :status-text="statusText('jellyfin')"
          :meta="serviceMeta('jellyfin')"
          :version="version"
          :users="users"
          :active="active"
          :now-playing="nowPlaying"
        />
        <JellyseerrWidget
          v-if="configsByService.jellyseerr?.enabled"
          :config-url="configsByService.jellyseerr?.url"
          :status-class="runtimeMap.jellyseerr.state"
          :status-text="statusText('jellyseerr')"
          :meta="serviceMeta('jellyseerr')"
          :pending="pending"
          :approved="approved"
          :available="available"
          :requests="requests"
        />
        <RecentlyAddedWidget :items="recentMedia" />
      </div>
    </div>

    <ServiceConfigModal
      :is-open="isModalOpen"
      :step="modalStep"
      :services="services"
      :editing-service="editingService"
      :config-form="configForm"
      :configs-by-service="configsByService"
      :is-api-key-visible="isApiKeyVisible"
      :test-result="testResult"
      :is-saving="isSaving"
      :is-deleting="isDeleting"
      :is-testing-connection="isTestingConnection"
      @close="closeModal"
      @back="goBackToServiceList"
      @edit-service="editService"
      @delete-config="deleteConfig"
      @toggle-api-key="toggleApiKeyVisibility"
      @test-connection="testConnection"
      @save="saveConfig"
      @update-field="updateField"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { Icon } from "@iconify/vue";
import ArrScheduleWidget from "@/components/media/ArrScheduleWidget.vue";
import ServiceConfigModal from "@/components/media/ServiceConfigModal.vue";
import ArrHealthWidget from "@/components/media/widgets/ArrHealthWidget.vue";
import DownloadClientWidget from "@/components/media/widgets/DownloadClientWidget.vue";
import JellyfinWidget from "@/components/media/widgets/JellyfinWidget.vue";
import JellyseerrWidget from "@/components/media/widgets/JellyseerrWidget.vue";
import ProwlarrWidget from "@/components/media/widgets/ProwlarrWidget.vue";
import RadarrWidget from "@/components/media/widgets/RadarrWidget.vue";
import RecentlyAddedWidget from "@/components/media/widgets/RecentlyAddedWidget.vue";
import RequestsFeedWidget from "@/components/media/widgets/RequestsFeedWidget.vue";
import SonarrWidget from "@/components/media/widgets/SonarrWidget.vue";
import { useMediaDashboard } from "@/composables/useMediaDashboard";
import type { SaveConfigPayload } from "@/types/media";

const props = defineProps<{ hostId?: number }>();
const {
  services,
  configsByService,
  hasAnyConfigured,
  isLoadingConfigs,
  isRefreshing,
  error: dashboardError,
  healthKicker,
  lastRefreshLabel,
  refreshNow,
  serviceMeta,
  statusText,
  runtimeMap,
  combinedSchedule,
  arrHealth,
  recentMedia,
  requestFeed,
  sonarr,
  radarr,
  jellyfin,
  jellyseerr,
  prowlarr,
  qbittorrent,
  modal,
} = useMediaDashboard(toRef(props, "hostId"));

const {
  seriesCount,
  episodeCount,
  missingCount: sonarrMissingCount,
  queue,
} = sonarr;

const {
  movieCount,
  availableCount: radarrAvailableCount,
  missingCount: radarrMissingCount,
} = radarr;

const { pending, approved, available, requests } = jellyseerr;
const { version, users, active, nowPlaying } = jellyfin;
const {
  total: indexerTotal,
  healthy: indexerHealthy,
  failing: indexerFailing,
  indexers,
} = prowlarr;
const {
  active: downloadActive,
  downloadSpeed,
  uploadSpeed,
  items: downloads,
} = qbittorrent;

const {
  isOpen: isModalOpen,
  step: modalStep,
  editingService,
  configForm,
  isApiKeyVisible,
  testResult,
  isSaving,
  isDeleting,
  isTestingConnection,
  open: openModal,
  editService,
  close: closeModal,
  testConnection,
  save: saveConfig,
  delete: deleteConfig,
} = modal;

const goBackToServiceList = () => {
  modalStep.value = "list";
};

const toggleApiKeyVisibility = () => {
  isApiKeyVisible.value = !isApiKeyVisible.value;
};

const updateField = (
  field: keyof SaveConfigPayload,
  value: string | boolean,
) => {
  configForm.value[field] = value as never;
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap");

.media-manager {
  --media-gap: 0.8rem;
  --media-widget-min-height: 210px;
  --media-modal-width: 560px;
  width: 100%;
  height: 100%;
  color: #d4d9e6;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  font-family:
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.main-content {
  height: 100%;
  overflow-y: auto;
  padding: var(--media-gap);
  scrollbar-width: thin;
  scrollbar-color: rgba(127, 161, 195, 0.4) rgba(255, 255, 255, 0.04);
}

.main-content::-webkit-scrollbar {
  width: 10px;
}
.main-content::-webkit-scrollbar-thumb {
  background: rgba(127, 161, 195, 0.35);
  border-radius: 999px;
}
.main-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}
.page-header,
.empty-card,
.state-panel {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(20, 25, 32, 0.8);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.9rem;
  padding: 0.8rem;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.kicker,
.page-subtitle,
.empty-text {
  color: rgba(255, 255, 255, 0.45);
}
.kicker {
  margin: 0;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.page-title {
  margin: 0.2rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.3rem;
}
.page-subtitle {
  margin: 0;
  font-size: 0.68rem;
}
.config-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(127, 161, 195, 0.12);
  color: #7fa1c3;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.48rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
}

.config-btn:focus-visible {
  outline: 2px solid rgba(127, 161, 195, 0.5);
  outline-offset: 2px;
}
.config-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-auto-flow: dense;
  gap: 0.75rem;
}
.span-two {
  grid-column: span 2;
}
.calendar-card {
  min-height: 0;
}
.state-panel,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  text-align: center;
  min-height: calc(100% - 92px);
  padding: 1.5rem;
}
.empty-state {
  height: 100%;
}
.empty-card {
  padding: 1.4rem;
}
.empty-icon {
  font-size: 54px;
  color: #7fa1c3;
}
.empty-title {
  margin: 0.3rem 0 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.loader {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: #7fa1c3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.spin {
  animation: spin 0.8s linear infinite;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions,
  .config-btn {
    width: 100%;
    justify-content: center;
  }
  .widgets-grid {
    grid-template-columns: 1fr;
  }
  .span-two {
    grid-column: auto;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
