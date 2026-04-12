import { ref } from "vue";
import { fetchJellyfinSnapshot } from "@/services/media/adapters";
import type { NowPlayingItem, RecentMediaItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useJellyfin = () => {
  const version = ref("");
  const users = ref(0);
  const active = ref(0);
  const nowPlaying = ref<NowPlayingItem[]>([]);
  const recentlyAdded = ref<RecentMediaItem[]>([]);

  const reset = () => {
    version.value = "";
    users.value = 0;
    active.value = 0;
    nowPlaying.value = [];
    recentlyAdded.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchJellyfinSnapshot(ctx);
    version.value = snapshot.version;
    users.value = snapshot.users;
    active.value = snapshot.active;
    nowPlaying.value = snapshot.nowPlaying;
    recentlyAdded.value = snapshot.recentlyAdded;
  };

  return {
    version,
    users,
    active,
    nowPlaying,
    recentlyAdded,
    reset,
    refresh,
  };
};
