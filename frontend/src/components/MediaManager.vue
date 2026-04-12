<template>
  <div
    class="h-full w-full bg-[linear-gradient(180deg,#0a0e12_0%,#0f1419_100%)] font-['Outfit',sans-serif] text-[#d4d9e6]"
    style="--media-widget-min-height: 210px; --media-modal-width: 560px"
  >
    <div v-if="!hostId" class="flex h-full flex-col items-center justify-center gap-[0.7rem] text-center">
      <div class="rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-[1.4rem] backdrop-blur-[8px]">
        <Icon icon="mdi:television-play" class="text-[54px] text-[#7fa1c3]" />
        <p class="mt-[0.3rem] uppercase tracking-[0.1em]">No Host Selected</p>
        <p class="text-white/45">Select a host to view media services.</p>
      </div>
    </div>

    <div v-else class="h-full overflow-y-auto p-[0.8rem]">
      <header class="mb-[0.9rem] flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-[0.8rem] backdrop-blur-[8px] max-sm:flex-col max-sm:items-stretch">
        <div>
          <p class="m-0 text-[0.62rem] uppercase tracking-[0.08em] text-white/45">{{ healthKicker }}</p>
          <h1 class="my-[0.2rem] text-[1.3rem] text-white/90">Consumer</h1>
          <p class="m-0 text-[0.68rem] text-white/45">
            Quick access and media stack telemetry · {{ lastRefreshLabel }}
          </p>
        </div>
        <div class="inline-flex items-center gap-2 max-sm:w-full">
          <button
            class="inline-flex items-center gap-[0.35rem] rounded-lg border border-white/10 bg-[#7fa1c3]/12 px-[0.75rem] py-[0.48rem] text-[0.72rem] font-semibold text-[#7fa1c3] transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa1c3]/50 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full max-sm:justify-center"
            :disabled="isRefreshing"
            @click="refreshNow"
          >
            <Icon icon="mdi:refresh" :class="{ 'animate-spin': isRefreshing }" />
            <span>{{ isRefreshing ? "Refreshing" : "Refresh" }}</span>
          </button>
          <button
            class="inline-flex items-center gap-[0.35rem] rounded-lg border border-white/10 bg-[#7fa1c3]/12 px-[0.75rem] py-[0.48rem] text-[0.72rem] font-semibold text-[#7fa1c3] transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa1c3]/50 max-sm:w-full max-sm:justify-center"
            @click="openModal"
          >
            <Icon icon="mdi:cog" />
            <span>Configure</span>
          </button>
        </div>
      </header>

      <div
        v-if="isLoadingConfigs"
        class="flex min-h-[calc(100%-92px)] flex-col items-center justify-center gap-[0.7rem] rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-6 text-center backdrop-blur-[8px]"
      >
        <div class="h-9 w-9 animate-spin rounded-full border-[3px] border-white/12 border-t-[#7fa1c3]"></div>
        <p>Loading services...</p>
      </div>
      <div
        v-else-if="dashboardError"
        class="flex min-h-[calc(100%-92px)] flex-col items-center justify-center gap-[0.7rem] rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-6 text-center backdrop-blur-[8px]"
      >
        <Icon icon="mdi:alert-octagon-outline" class="text-[54px] text-[#7fa1c3]" />
        <h3>Media dashboard unavailable</h3>
        <p class="text-white/45">{{ dashboardError }}</p>
        <button
          class="inline-flex items-center gap-[0.35rem] rounded-lg border border-white/10 bg-[#7fa1c3]/12 px-[0.75rem] py-[0.48rem] text-[0.72rem] font-semibold text-[#7fa1c3] transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa1c3]/50"
          @click="refreshNow"
        >
          Retry
        </button>
      </div>
      <div
        v-else-if="!hasAnyConfigured"
        class="flex min-h-[calc(100%-92px)] flex-col items-center justify-center gap-[0.7rem] rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-6 text-center backdrop-blur-[8px]"
      >
        <Icon icon="mdi:server-off" class="text-[54px] text-[#7fa1c3]" />
        <h3>No Services Configured</h3>
        <p class="text-white/45">
          Add Sonarr, Radarr, Jellyfin, Jellyseerr, Prowlarr, or qBittorrent to
          begin.
        </p>
        <button
          class="inline-flex items-center gap-[0.35rem] rounded-lg border border-white/10 bg-[#7fa1c3]/12 px-[0.75rem] py-[0.48rem] text-[0.72rem] font-semibold text-[#7fa1c3] transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa1c3]/50"
          @click="openModal"
        >
          <Icon icon="mdi:plus" />Add Service
        </button>
      </div>

      <div v-else class="grid auto-flow-dense grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 max-sm:grid-cols-1">
        <ArrScheduleWidget
          class="min-h-0 md:col-span-2"
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
          class="md:col-span-2"
          :config-url="configsByService.sonarr?.url"
          :status-class="runtimeMap.sonarr.state"
          :status-text="statusText('sonarr')"
          :meta="serviceMeta('sonarr')"
          :series-count="seriesCount"
          :episode-count="episodeCount"
          :missing-count="sonarrMissingCount"
          :queue="queue"
        />
        <RequestsFeedWidget class="md:col-span-2" :requests="requestFeed" />
        <ArrHealthWidget class="md:col-span-2" :items="arrHealth" />
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
          class="md:col-span-2"
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
