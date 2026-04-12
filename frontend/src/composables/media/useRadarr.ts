import { ref } from "vue";
import { fetchRadarrSnapshot } from "@/services/media/adapters";
import type { HealthIssue, RecentMediaItem, UpcomingItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useRadarr = () => {
  const movieCount = ref(0);
  const availableCount = ref(0);
  const missingCount = ref(0);
  const upcoming = ref<UpcomingItem[]>([]);
  const health = ref<HealthIssue[]>([]);
  const recentlyAdded = ref<RecentMediaItem[]>([]);

  const reset = () => {
    movieCount.value = 0;
    availableCount.value = 0;
    missingCount.value = 0;
    upcoming.value = [];
    health.value = [];
    recentlyAdded.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchRadarrSnapshot(ctx);
    movieCount.value = snapshot.movieCount;
    availableCount.value = snapshot.availableCount;
    missingCount.value = snapshot.missingCount;
    upcoming.value = snapshot.upcoming;
    health.value = snapshot.health;
    recentlyAdded.value = snapshot.recentlyAdded;
  };

  return {
    movieCount,
    availableCount,
    missingCount,
    upcoming,
    health,
    recentlyAdded,
    reset,
    refresh,
  };
};
