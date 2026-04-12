import type {
  MediaServiceDefinition,
  MediaServiceType,
  SaveConfigPayload,
  ServiceRuntime,
  UpcomingItem,
} from "@/types/media";

export const mediaServices: MediaServiceDefinition[] = [
  { type: "sonarr", name: "Sonarr", icon: "simple-icons:sonarr" },
  { type: "radarr", name: "Radarr", icon: "simple-icons:radarr" },
  { type: "jellyfin", name: "Jellyfin", icon: "simple-icons:jellyfin" },
  { type: "jellyseerr", name: "Jellyseerr", icon: "simple-icons:jellyseerr" },
  { type: "prowlarr", name: "Prowlarr", icon: "mdi:satellite-variant" },
  { type: "qbittorrent", name: "qBittorrent", icon: "simple-icons:qbittorrent" },
];

export const mediaItemLimits = {
  calendar: 12,
  downloads: 5,
  health: 6,
  indexers: 5,
  nowPlaying: 5,
  recentMedia: 8,
  queue: 4,
  requests: 5,
} as const;

export const createInitialRuntime = (): Record<MediaServiceType, ServiceRuntime> => ({
  sonarr: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
  radarr: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
  jellyfin: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
  jellyseerr: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
  prowlarr: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
  qbittorrent: { state: "unknown", lastSuccessAt: null, lastError: null, latencyMs: null },
});

export const createConfigPayload = (serviceType: MediaServiceType): SaveConfigPayload => ({
  serviceType,
  url: "",
  apiKey: "",
  enabled: true,
});

export const sortUpcomingItems = (entries: UpcomingItem[]) => {
  return [...entries].sort((a, b) => {
    if (a.scheduledAt == null && b.scheduledAt == null) return 0;
    if (a.scheduledAt == null) return 1;
    if (b.scheduledAt == null) return -1;
    return a.scheduledAt - b.scheduledAt;
  });
};
