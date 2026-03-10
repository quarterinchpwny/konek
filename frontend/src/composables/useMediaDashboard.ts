import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { createInitialRuntime, mediaServices } from "@/composables/media/constants";
import {
  classifyMediaError,
  formatServiceMeta,
  formatStatusText,
  isAbortError,
  stringifyMediaError,
} from "@/composables/media/runtime";
import { useJellyfin } from "@/composables/media/useJellyfin";
import { useJellyseerr } from "@/composables/media/useJellyseerr";
import { useMediaConfigs } from "@/composables/media/useMediaConfigs";
import { useMediaDerived } from "@/composables/media/useMediaDerived";
import { useProwlarr } from "@/composables/media/useProwlarr";
import { useQbittorrent } from "@/composables/media/useQbittorrent";
import { useRadarr } from "@/composables/media/useRadarr";
import { useSonarr } from "@/composables/media/useSonarr";
import { probeService } from "@/services/media/adapters";
import type { MediaServiceType } from "@/types/media";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const useMediaDashboard = (hostId: Ref<number | undefined>) => {
  const configState = useMediaConfigs();
  const sonarr = useSonarr();
  const radarr = useRadarr();
  const jellyfin = useJellyfin();
  const jellyseerr = useJellyseerr();
  const prowlarr = useProwlarr();
  const qbittorrent = useQbittorrent();

  const runtimeMap = ref(createInitialRuntime());
  const isRefreshing = ref(false);
  const lastRefreshAt = ref<number | null>(null);
  const error = ref<string | null>(null);

  let pollTimer: number | null = null;
  let currentCycleController: AbortController | null = null;
  let cycleInFlight = false;
  let failureCount = 0;
  const visibilityListener = () => document.visibilityState === "visible" && void runRefreshCycle();

  const setDisabledStates = () => {
    for (const service of mediaServices) {
      if (!configState.configsByService.value[service.type]?.enabled) {
        runtimeMap.value[service.type] = {
          ...runtimeMap.value[service.type],
          state: "disabled",
          lastError: null,
          latencyMs: null,
        };
      }
    }
  };

  const resetDashboardData = () => {
    sonarr.reset();
    radarr.reset();
    jellyfin.reset();
    jellyseerr.reset();
    prowlarr.reset();
    qbittorrent.reset();
    runtimeMap.value = createInitialRuntime();
    lastRefreshAt.value = null;
    error.value = null;
  };

  const {
    combinedSchedule,
    arrHealth,
    recentMedia,
    requestFeed,
    healthKicker,
    lastRefreshLabel,
  } = useMediaDerived({
    configsByService: configState.configsByService,
    runtimeMap,
    sonarrUpcoming: sonarr.upcoming,
    radarrUpcoming: radarr.upcoming,
    sonarrHealth: sonarr.health,
    radarrHealth: radarr.health,
    recentEntries: computed(() => [
      ...jellyfin.recentlyAdded.value,
      ...sonarr.recentlyAdded.value,
      ...radarr.recentlyAdded.value,
    ]),
    requests: jellyseerr.requests,
    lastRefreshAt,
  });

  const serviceMeta = (type: MediaServiceType) => formatServiceMeta(runtimeMap.value, type);
  const statusText = (type: MediaServiceType) => formatStatusText(runtimeMap.value, type);

  const stopPolling = () => {
    if (pollTimer != null) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (currentCycleController) {
      currentCycleController.abort();
      currentCycleController = null;
    }
  };

  const scheduleNextCycle = () => {
    if (!hostId.value) {
      return;
    }

    const baseDelay = 30000;
    const delay = baseDelay * 2 ** Math.min(3, failureCount);
    const hiddenMultiplier = document.visibilityState === "hidden" ? 2 : 1;
    const jitter = Math.floor(Math.random() * 2500);
    pollTimer = window.setTimeout(() => void runRefreshCycle(), delay * hiddenMultiplier + jitter);
  };

  const loadConfigs = async () => {
    try {
      await configState.fetchConfigs(hostId.value);
      error.value = null;
      setDisabledStates();
    } catch (nextError) {
      error.value = stringifyMediaError(nextError);
      throw nextError;
    }
  };

  const refreshService = async (type: MediaServiceType, signal: AbortSignal) => {
    const config = configState.configsByService.value[type];
    if (!hostId.value || !config?.enabled) {
      runtimeMap.value[type] = {
        ...runtimeMap.value[type],
        state: "disabled",
        lastError: null,
        latencyMs: null,
      };
      return;
    }

    runtimeMap.value[type] = {
      ...runtimeMap.value[type],
      state: "checking",
      lastError: null,
    };

    try {
      const latencyMs = await probeService({ baseUrl, hostId: hostId.value, signal }, type);
      runtimeMap.value[type] = {
        ...runtimeMap.value[type],
        state: "online",
        latencyMs,
        lastSuccessAt: Date.now(),
      };

      if (type === "sonarr") await sonarr.refresh({ baseUrl, hostId: hostId.value, signal });
      if (type === "radarr") await radarr.refresh({ baseUrl, hostId: hostId.value, signal });
      if (type === "jellyfin") await jellyfin.refresh({ baseUrl, hostId: hostId.value, signal });
      if (type === "jellyseerr") await jellyseerr.refresh({ baseUrl, hostId: hostId.value, signal });
      if (type === "prowlarr") await prowlarr.refresh({ baseUrl, hostId: hostId.value, signal });
      if (type === "qbittorrent") await qbittorrent.refresh({ baseUrl, hostId: hostId.value, signal });
    } catch (nextError) {
      if (isAbortError(nextError)) {
        return;
      }

      runtimeMap.value[type] = {
        ...runtimeMap.value[type],
        state: classifyMediaError(nextError),
        lastError: stringifyMediaError(nextError),
      };
      throw nextError;
    }
  };

  const runRefreshCycle = async () => {
    if (!hostId.value || cycleInFlight) {
      return;
    }

    if (pollTimer != null) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }

    cycleInFlight = true;
    isRefreshing.value = true;
    currentCycleController = new AbortController();
    let hadFailure = false;

    try {
      const enabled = mediaServices
        .map((service) => service.type)
        .filter((type) => configState.configsByService.value[type]?.enabled);

      await Promise.all(
        enabled.map(async (type) => {
          try {
            await refreshService(type, currentCycleController!.signal);
          } catch (nextError) {
            if (!isAbortError(nextError)) {
              hadFailure = true;
            }
          }
        }),
      );

      lastRefreshAt.value = Date.now();
    } finally {
      failureCount = hadFailure ? failureCount + 1 : 0;
      cycleInFlight = false;
      isRefreshing.value = false;
      currentCycleController = null;
      scheduleNextCycle();
    }
  };

  const refreshNow = async () => {
    try {
      error.value = null;
      await loadConfigs();
      await runRefreshCycle();
    } catch {
      scheduleNextCycle();
    }
  };

  onMounted(() => document.addEventListener("visibilitychange", visibilityListener));
  onUnmounted(() => {
    stopPolling();
    document.removeEventListener("visibilitychange", visibilityListener);
  });

  watch(
    hostId,
    async (nextHostId) => {
      stopPolling();
      resetDashboardData();
      configState.closeModal();

      if (!nextHostId) {
        configState.configs.value = [];
        return;
      }

      try {
        await loadConfigs();
        await runRefreshCycle();
      } catch {
        scheduleNextCycle();
      }
    },
    { immediate: true },
  );

  return {
    services: mediaServices,
    configsByService: configState.configsByService,
    hasAnyConfigured: configState.hasAnyConfigured,
    isLoadingConfigs: configState.isLoading,
    isRefreshing,
    error,
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
    modal: {
      isOpen: configState.isModalOpen,
      step: configState.modalStep,
      editingService: configState.editingService,
      configForm: configState.configForm,
      isApiKeyVisible: configState.isApiKeyVisible,
      testResult: configState.testResult,
      isSaving: configState.isSaving,
      isTestingConnection: configState.isTestingConnection,
      open: configState.openModal,
      editService: configState.editService,
      close: configState.closeModal,
      testConnection: () => configState.testConnection(hostId.value),
      save: () => configState.saveConfig(hostId.value, async () => {
        await loadConfigs();
        await runRefreshCycle();
      }),
    },
  };
};
