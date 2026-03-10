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
        <RequestsFeedWidget class="span-two" :requests="requestFeed" />
        <RecentlyAddedWidget class="span-two" :items="recentMedia" />
        <ArrHealthWidget class="span-two" :items="arrHealth" />
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
      :is-testing-connection="isTestingConnection"
      @close="closeModal"
      @back="goBackToServiceList"
      @edit-service="editService"
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
  isTestingConnection,
  open: openModal,
  editService,
  close: closeModal,
  testConnection,
  save: saveConfig,
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
@import "@/components/media/media-manager.css";
</style>
