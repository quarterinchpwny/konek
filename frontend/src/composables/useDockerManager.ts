import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { useSshStore } from "../stores/SSHStore";
import { useDockerStore } from "../stores/dockerStore";

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  health: string;
  restartPolicy: string;
  compose?: {
    project: string;
    service: string;
  };
  stats?: {
    cpu: number;
    memUsed: number;
    memLimit: number;
  };
  group?: string;
  labels?: Record<string, string>;
}

const HISTORY_LENGTH = 20;

const knownServiceIcons: Array<{ match: RegExp; icon: string }> = [
  { match: /jellyfin/i, icon: "simple-icons:jellyfin" },
  { match: /jellyseerr/i, icon: "simple-icons:jellyseerr" },
  { match: /radarr/i, icon: "simple-icons:radarr" },
  { match: /sonarr/i, icon: "simple-icons:sonarr" },
  { match: /plex/i, icon: "simple-icons:plex" },
  { match: /emby/i, icon: "simple-icons:emby" },
  { match: /nginx/i, icon: "simple-icons:nginx" },
  { match: /traefik/i, icon: "simple-icons:traefikproxy" },
  { match: /grafana/i, icon: "simple-icons:grafana" },
  { match: /prometheus/i, icon: "simple-icons:prometheus" },
  { match: /redis/i, icon: "simple-icons:redis" },
  { match: /(postgres|postgresql)/i, icon: "simple-icons:postgresql" },
  { match: /(mariadb|mysql)/i, icon: "simple-icons:mysql" },
  { match: /mongo/i, icon: "simple-icons:mongodb" },
  { match: /portainer/i, icon: "simple-icons:portainer" },
  { match: /homeassistant/i, icon: "simple-icons:homeassistant" },
  { match: /qbittorrent/i, icon: "simple-icons:qbittorrent" },
  { match: /transmission/i, icon: "simple-icons:transmission" },
];

export const useDockerManager = (hostId: Ref<number | undefined>) => {
  const sshStore = useSshStore();
  const dockerStore = useDockerStore();

  const stats = ref<any>(null);
  const isLoading = ref(false);
  const showLogsModal = ref(false);
  const selectedContainerId = ref<string | undefined>(undefined);
  const search = ref("");
  const showOnlyRunning = ref(false);
  const collapsed = ref<Record<string, boolean>>({});
  const iconCache = ref<Record<string, string>>({});
  const historyCache = ref<Record<string, { cpu: number[]; mem: number[] }>>({});
  let intervalId: number | null = null;

  const dockerInfo = computed(() => stats.value?.docker);

  const runningCount = computed(() => {
    return (dockerInfo.value?.containers || []).filter((c: Container) => c.status.startsWith("Up")).length;
  });

  const memPercent = (c: Container) => {
    if (!c.stats?.memUsed || !c.stats?.memLimit) return 0;
    return Math.min(100, (c.stats.memUsed / c.stats.memLimit) * 100);
  };

  const fetchStats = async () => {
    if (!hostId.value) return;

    if (!stats.value) {
      isLoading.value = true;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${hostId.value}`);
      if (!res.ok) return;

      const newStats = await res.json();
      const incomingContainers = (newStats?.docker?.containers ?? []) as Container[];

      if (stats.value?.docker?.containers) {
        const oldMap = new Map<string, Container>(
          stats.value.docker.containers.map((c: Container) => [c.id, c]),
        );
        const newMap = new Map<string, Container>(
          incomingContainers.map((c: Container) => [c.id, c]),
        );

        oldMap.forEach((oldContainer: Container, id: string) => {
          const newContainer = newMap.get(id);
          if (newContainer) {
            Object.keys(newContainer).forEach((key) => {
              (oldContainer as any)[key] = (newContainer as any)[key];
            });

            if (newContainer.stats) {
              if (!historyCache.value[id]) {
                historyCache.value[id] = { cpu: [], mem: [] };
              }
              const history = historyCache.value[id];
              history.cpu.push(newContainer.stats.cpu);
              history.mem.push(memPercent(newContainer as Container));

              if (history.cpu.length > HISTORY_LENGTH) history.cpu.shift();
              if (history.mem.length > HISTORY_LENGTH) history.mem.shift();
            }
          }
        });

        newMap.forEach((newContainer: Container, id: string) => {
          if (!oldMap.has(id)) {
            stats.value.docker.containers.push(newContainer);
            if (newContainer.stats) {
              historyCache.value[id] = {
                cpu: [newContainer.stats.cpu],
                mem: [memPercent(newContainer as Container)],
              };
            }
          }
        });

        stats.value.docker.containers = stats.value.docker.containers.filter(
          (c: Container) => newMap.has(c.id),
        );

        Object.keys(historyCache.value).forEach((idString: string) => {
          if (!newMap.has(idString)) {
            delete historyCache.value[idString];
          }
        });
      } else {
        stats.value = newStats;
        if (newStats.docker?.containers) {
          newStats.docker.containers.forEach((c: Container) => {
            if (c.stats) {
              historyCache.value[c.id] = {
                cpu: [c.stats.cpu],
                mem: [memPercent(c)],
              };
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  };

  const groupedContainers = computed(() => {
    const q = search.value.toLowerCase();
    const filtered = (dockerInfo.value?.containers || []).filter((c: Container) => {
      if (showOnlyRunning.value && !c.status.startsWith("Up")) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.group?.toLowerCase().includes(q) ||
        c.compose?.project?.toLowerCase().includes(q) ||
        c.compose?.service?.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, Container[]> = {};
    filtered.forEach((c: Container) => {
      const key = c.group || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  });

  const stackTotals = computed(() => {
    const totals: Record<string, { cpu: number; memUsed: number; memLimit: number }> = {};
    (dockerInfo.value?.containers || []).forEach((c: Container) => {
      const g = c.group;
      if (!g || !c.stats) return;
      if (!totals[g]) totals[g] = { cpu: 0, memUsed: 0, memLimit: 0 };
      totals[g].cpu += c.stats.cpu;
      totals[g].memUsed += c.stats.memUsed;
      totals[g].memLimit += c.stats.memLimit;
    });
    return totals;
  });

  const handleAction = async (id: string, action: "start" | "stop" | "restart") => {
    await dockerStore.performAction(id, action);
    fetchStats();
  };

  const openLogs = (id: string) => {
    selectedContainerId.value = id;
    showLogsModal.value = true;
  };

  const getStatusClass = (status: string) => {
    if (status.startsWith("Up")) return "status-up";
    if (status.startsWith("Exited")) return "status-exited";
    return "status-other";
  };

  const formatBytes = (b: number) => {
    if (!b) return "0B";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) {
      b /= 1024;
      i += 1;
    }
    return `${b.toFixed(1)}${u[i]}`;
  };

  const getIcon = (containerData: Container) => {
    if (!containerData) return "mdi:docker";
    const iconSource = [
      containerData.labels?.["com.docker.compose.project"],
      containerData.compose?.project,
      containerData.name,
      containerData.image,
    ]
      .filter(Boolean)
      .join(" ");
    const known = knownServiceIcons.find((entry) => entry.match.test(iconSource));
    if (known) return known.icon;
    return "mdi:docker";
  };

  const getIconCached = (container: Container) => {
    const id = container.id;
    if (iconCache.value[id]) return iconCache.value[id];
    const icon = getIcon(container);
    iconCache.value[id] = icon;
    return icon;
  };

  const getCpuHistory = (container: Container) => {
    const history = historyCache.value[container.id]?.cpu || [];
    const padded = [...Array(HISTORY_LENGTH - history.length).fill(0), ...history];
    return padded;
  };

  const getMemHistory = (container: Container) => {
    const history = historyCache.value[container.id]?.mem || [];
    const padded = [...Array(HISTORY_LENGTH - history.length).fill(0), ...history];
    return padded;
  };

  onMounted(() => {
    if (!hostId.value) return;
    sshStore.connect(hostId.value).then(() => {
      fetchStats();
      intervalId = setInterval(fetchStats, 5000) as unknown as number;
    });
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  watch(hostId, (newHostId) => {
    if (intervalId) clearInterval(intervalId);
    stats.value = null;
    historyCache.value = {};
    if (!newHostId) return;
    sshStore.connect(newHostId).then(() => {
      fetchStats();
      intervalId = setInterval(fetchStats, 5000) as unknown as number;
    });
  });

  return {
    HISTORY_LENGTH,
    dockerInfo,
    isLoading,
    showLogsModal,
    selectedContainerId,
    search,
    showOnlyRunning,
    collapsed,
    runningCount,
    groupedContainers,
    stackTotals,
    handleAction,
    openLogs,
    getStatusClass,
    formatBytes,
    getIconCached,
    getCpuHistory,
    getMemHistory,
  };
};
