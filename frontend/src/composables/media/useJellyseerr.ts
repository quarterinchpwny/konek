import { ref } from "vue";
import { fetchJellyseerrSnapshot } from "@/services/media/adapters";
import type { RequestItem } from "@/types/media";

interface RefreshContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

export const useJellyseerr = () => {
  const pending = ref(0);
  const approved = ref(0);
  const available = ref(0);
  const requests = ref<RequestItem[]>([]);

  const reset = () => {
    pending.value = 0;
    approved.value = 0;
    available.value = 0;
    requests.value = [];
  };

  const refresh = async (ctx: RefreshContext) => {
    const snapshot = await fetchJellyseerrSnapshot(ctx);
    pending.value = snapshot.pending;
    approved.value = snapshot.approved;
    available.value = snapshot.available;
    requests.value = snapshot.requests;
  };

  return {
    pending,
    approved,
    available,
    requests,
    reset,
    refresh,
  };
};
