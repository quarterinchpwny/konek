import { ref } from "vue";
import { fetchProwlarrSnapshot } from "@/services/media/adapters";
import type { IndexerStatusItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useProwlarr = () => {
  const total = ref(0);
  const healthy = ref(0);
  const failing = ref(0);
  const indexers = ref<IndexerStatusItem[]>([]);

  const reset = () => {
    total.value = 0;
    healthy.value = 0;
    failing.value = 0;
    indexers.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchProwlarrSnapshot(ctx);
    total.value = snapshot.total;
    healthy.value = snapshot.healthy;
    failing.value = snapshot.failing;
    indexers.value = snapshot.indexers;
  };

  return {
    total,
    healthy,
    failing,
    indexers,
    reset,
    refresh,
  };
};
