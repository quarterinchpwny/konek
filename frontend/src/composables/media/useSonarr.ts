import { ref } from "vue";
import { fetchSonarrSnapshot } from "@/services/media/adapters";
import type { HealthIssue, QueueItem, RecentMediaItem, UpcomingItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useSonarr = () => {
  const seriesCount = ref(0);
  const episodeCount = ref(0);
  const missingCount = ref(0);
  const queue = ref<QueueItem[]>([]);
  const upcoming = ref<UpcomingItem[]>([]);
  const health = ref<HealthIssue[]>([]);
  const recentlyAdded = ref<RecentMediaItem[]>([]);

  const reset = () => {
    seriesCount.value = 0;
    episodeCount.value = 0;
    missingCount.value = 0;
    queue.value = [];
    upcoming.value = [];
    health.value = [];
    recentlyAdded.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchSonarrSnapshot(ctx);
    seriesCount.value = snapshot.seriesCount;
    episodeCount.value = snapshot.episodeCount;
    missingCount.value = snapshot.missingCount;
    queue.value = snapshot.queue;
    upcoming.value = snapshot.upcoming;
    health.value = snapshot.health;
    recentlyAdded.value = snapshot.recentlyAdded;
  };

  return {
    seriesCount,
    episodeCount,
    missingCount,
    queue,
    upcoming,
    health,
    recentlyAdded,
    reset,
    refresh,
  };
};
