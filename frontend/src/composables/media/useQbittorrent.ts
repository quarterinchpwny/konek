import { ref } from "vue";
import { fetchQbittorrentSnapshot } from "@/services/media/adapters";
import type { DownloadItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useQbittorrent = () => {
  const active = ref(0);
  const downloading = ref(0);
  const seeding = ref(0);
  const downloadSpeed = ref("0 B/s");
  const uploadSpeed = ref("0 B/s");
  const items = ref<DownloadItem[]>([]);

  const reset = () => {
    active.value = 0;
    downloading.value = 0;
    seeding.value = 0;
    downloadSpeed.value = "0 B/s";
    uploadSpeed.value = "0 B/s";
    items.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchQbittorrentSnapshot(ctx);
    active.value = snapshot.active;
    downloading.value = snapshot.downloading;
    seeding.value = snapshot.seeding;
    downloadSpeed.value = snapshot.downloadSpeed;
    uploadSpeed.value = snapshot.uploadSpeed;
    items.value = snapshot.items;
  };

  return {
    active,
    downloading,
    seeding,
    downloadSpeed,
    uploadSpeed,
    items,
    reset,
    refresh,
  };
};
