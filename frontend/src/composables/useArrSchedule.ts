import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { fetchRadarrSnapshot, fetchSonarrSnapshot } from "@/services/media/adapters";
import type { MediaConfig, UpcomingItem } from "@/types/media";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const useArrSchedule = (hostId: Ref<number | null | undefined>) => {
  const entries = ref<UpcomingItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  let timerId: number | null = null;
  let controller: AbortController | null = null;

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => {
      if (a.scheduledAt == null && b.scheduledAt == null) return 0;
      if (a.scheduledAt == null) return 1;
      if (b.scheduledAt == null) return -1;
      return a.scheduledAt - b.scheduledAt;
    });
  });

  const stop = () => {
    if (timerId != null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  const schedule = (delay = 60000) => {
    if (!hostId.value) return;
    timerId = window.setTimeout(() => {
      void refresh();
    }, delay);
  };

  const refresh = async () => {
    if (!hostId.value) {
      entries.value = [];
      error.value = null;
      return;
    }

    stop();
    controller = new AbortController();
    isLoading.value = true;
    error.value = null;

    try {
      const configResponse = await fetch(`${baseUrl}/hosts/${hostId.value}/media`, {
        signal: controller.signal,
      });

      if (!configResponse.ok) {
        throw new Error("Unable to load media configs");
      }

      const configs = (await configResponse.json()) as MediaConfig[];
      const sonarrEnabled = Boolean(configs.find((c) => c.serviceType === "sonarr")?.enabled);
      const radarrEnabled = Boolean(configs.find((c) => c.serviceType === "radarr")?.enabled);

      const [sonarr, radarr] = await Promise.all([
        sonarrEnabled
          ? fetchSonarrSnapshot({ baseUrl, hostId: hostId.value, signal: controller.signal })
          : null,
        radarrEnabled
          ? fetchRadarrSnapshot({ baseUrl, hostId: hostId.value, signal: controller.signal })
          : null,
      ]);

      entries.value = [...(sonarr?.upcoming ?? []), ...(radarr?.upcoming ?? [])]
        .sort((a, b) => {
          if (a.scheduledAt == null && b.scheduledAt == null) return 0;
          if (a.scheduledAt == null) return 1;
          if (b.scheduledAt == null) return -1;
          return a.scheduledAt - b.scheduledAt;
        })
        .slice(0, 8);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        error.value = e instanceof Error ? e.message : "Schedule unavailable";
      }
    } finally {
      isLoading.value = false;
      controller = null;
      schedule();
    }
  };

  watch(
    hostId,
    async () => {
      entries.value = [];
      error.value = null;
      await refresh();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    stop();
  });

  return {
    entries: sortedEntries,
    isLoading,
    error,
    refresh,
  };
};
