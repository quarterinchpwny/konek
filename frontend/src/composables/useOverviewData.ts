import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useHostStore } from "../stores/hostStore";

export interface OverviewProps {
  hostId: number | null;
  sessionId: string | null;
  serverStatus: string;
}

interface DockerService {
  id: string;
  name: string;
  image: string;
  status: string;
  health?: string | null;
  compose?: {
    project?: string | null;
    service?: string | null;
  } | null;
}

interface StatsSnapshot {
  cpu?: {
    usagePercent: number;
    load?: number[];
  } | null;
  memory?: {
    percent: number;
    total: number;
    used: number;
  } | null;
  disk?: Array<{
    mount: string;
    percent: string;
    total: string;
    used: string;
  }> | null;
  processes?: {
    total: number;
  } | null;
  system?: {
    hostname?: string;
    uptime?: string;
  } | null;
  status?: string;
  docker?: {
    containers: DockerService[];
  } | null;
}

export const useOverviewData = (props: OverviewProps) => {
  const hostStore = useHostStore();
  const selectedHost = computed(() => hostStore.selectedHost);

  const snapshot = ref<StatsSnapshot | null>(null);
  let intervalId: number | null = null;

  const isRunning = (state: string) => {
    const normalized = state.toLowerCase();
    return normalized.includes("up") || normalized.includes("running");
  };

  const statusClass = computed(() => {
    if (props.serverStatus === "online") return "status-online";
    if (props.serverStatus === "offline") return "status-offline";
    return "status-unknown";
  });

  const allServices = computed<DockerService[]>(() => {
    return snapshot.value?.docker?.containers ?? [];
  });

  const topServices = computed<DockerService[]>(() => {
    return allServices.value.slice(0, 8);
  });

  const totalContainers = computed(() => allServices.value.length);

  const runningContainers = computed(() => {
    return allServices.value.filter((service) => isRunning(service.status)).length;
  });

  const stoppedContainers = computed(() => {
    return Math.max(0, totalContainers.value - runningContainers.value);
  });

  const serviceCount = computed(() => allServices.value.length);

  const serviceUpCount = computed(() => {
    return allServices.value.filter((service) => isRunning(service.status)).length;
  });

  const serviceDownCount = computed(() => {
    return Math.max(0, serviceCount.value - serviceUpCount.value);
  });

  const cpuUsagePercent = computed(() => {
    return snapshot.value?.cpu?.usagePercent ?? null;
  });

  const cpuLoadAverage = computed(() => {
    return snapshot.value?.cpu?.load?.[0] ?? null;
  });

  const memoryPercent = computed(() => {
    return snapshot.value?.memory?.percent ?? null;
  });

  const memoryUsed = computed(() => {
    return snapshot.value?.memory?.used ?? null;
  });

  const memoryTotal = computed(() => {
    return snapshot.value?.memory?.total ?? null;
  });

  const primaryDisk = computed(() => {
    return snapshot.value?.disk?.[0] ?? null;
  });

  const processTotal = computed(() => {
    return snapshot.value?.processes?.total ?? null;
  });

  const systemHostname = computed(() => {
    return snapshot.value?.system?.hostname ?? null;
  });

  const systemUptime = computed(() => {
    return snapshot.value?.system?.uptime ?? null;
  });

  const fetchStatsSnapshot = async () => {
    if (props.hostId == null) {
      snapshot.value = null;
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`);

    if (!response.ok) {
      snapshot.value = null;
      return;
    }

    snapshot.value = (await response.json()) as StatsSnapshot;
  };

  const startPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    intervalId = setInterval(fetchStatsSnapshot, 10000) as unknown as number;
  };

  onMounted(async () => {
    await fetchStatsSnapshot();
    startPolling();
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  watch(
    () => props.hostId,
    async () => {
      await fetchStatsSnapshot();
      startPolling();
    },
  );

  watch(
    () => props.serverStatus,
    async (status) => {
      if (status === "online") {
        await fetchStatsSnapshot();
      }
    },
  );

  return {
    cpuLoadAverage,
    cpuUsagePercent,
    isRunning,
    memoryPercent,
    memoryTotal,
    memoryUsed,
    primaryDisk,
    processTotal,
    runningContainers,
    selectedHost,
    serviceCount,
    serviceDownCount,
    serviceUpCount,
    statusClass,
    stoppedContainers,
    systemHostname,
    systemUptime,
    topServices,
    totalContainers,
  };
};
