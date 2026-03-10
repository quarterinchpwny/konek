import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

const HISTORY_SIZE = 30;

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

export const useServerStats = (hostId: Ref<number>) => {
  const stats = ref<any>(null);
  const status = ref("loading");
  const cpuHistory = ref<number[]>([]);
  const memoryHistory = ref<number[]>([]);
  const iconCache = ref<Record<string, string>>({});
  let intervalId: number | null = null;

  const fetchStats = async () => {
    if (!hostId.value) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stats/${hostId.value}`);

      if (!res.ok) {
        const errorData = await res.json();
        status.value = errorData.status || "offline";
        stats.value = null;
        return;
      }

      const data = await res.json();
      stats.value = data;
      status.value = "online";

      const cpuPercent = Math.min(100, Math.max(0, data.cpu.usagePercent));
      cpuHistory.value.push(cpuPercent);
      if (cpuHistory.value.length > HISTORY_SIZE) {
        cpuHistory.value.shift();
      }

      const memPercent = Math.min(100, Math.max(0, data.memory.percent));
      memoryHistory.value.push(memPercent);
      if (memoryHistory.value.length > HISTORY_SIZE) {
        memoryHistory.value.shift();
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      status.value = "offline";
      stats.value = null;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedValue = (bytes / Math.pow(k, i)).toFixed(2);
    return `${formattedValue} ${sizes[i]}`;
  };

  const getStatusClass = (statusText: string) => {
    if (statusText.startsWith("Up")) return "status-up";
    if (statusText.startsWith("Exited")) return "status-exited";
    return "status-other";
  };

  const getIcon = (containerData: Record<string, any>) => {
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

  const getIconCached = (container: Record<string, any>) => {
    const id = container.id;
    if (iconCache.value[id]) return iconCache.value[id];
    const icon = getIcon(container);
    iconCache.value[id] = icon;
    return icon;
  };

  const startPolling = () => {
    fetchStats();
    intervalId = setInterval(fetchStats, 5000);
  };

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  watch(hostId, () => {
    stats.value = null;
    status.value = "loading";
    cpuHistory.value = [];
    memoryHistory.value = [];
    if (intervalId) clearInterval(intervalId);
    startPolling();
  });

  return {
    stats,
    status,
    cpuHistory,
    memoryHistory,
    formatBytes,
    getStatusClass,
    getIconCached,
  };
};
