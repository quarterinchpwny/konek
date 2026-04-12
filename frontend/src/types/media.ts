export type MediaServiceType =
  | "sonarr"
  | "radarr"
  | "jellyfin"
  | "jellyseerr"
  | "prowlarr"
  | "qbittorrent";

export type ServiceHealthState =
  | "unknown"
  | "checking"
  | "online"
  | "degraded"
  | "offline"
  | "disabled"
  | "auth_error"
  | "timeout";

export interface MediaServiceDefinition {
  type: MediaServiceType;
  name: string;
  icon: string;
}

export interface MediaConfig {
  id?: number;
  hostId?: number;
  serviceType: MediaServiceType;
  url: string;
  apiKey?: string;
  hasApiKey?: boolean;
  enabled: boolean;
}

export interface QueueItem {
  id: number;
  title: string;
  status: string;
  progress: number;
}

export interface HealthIssue {
  id: string;
  source: "sonarr" | "radarr";
  level: "error" | "warning" | "info";
  message: string;
  type: string;
}

export interface UpcomingItem {
  id: number;
  title: string;
  date: string;
  scheduledAt: number | null;
  source: "sonarr" | "radarr";
}

export interface RequestItem {
  id: number;
  title: string;
  status: "Pending" | "Approved" | "Available";
  requestedBy?: string;
  createdAt?: string;
  mediaType?: "movie" | "tv";
}

export interface NowPlayingItem {
  id: string;
  title: string;
  user: string;
}

export interface RecentMediaItem {
  id: string;
  title: string;
  subtitle: string;
  addedAt: number | null;
  addedAtLabel: string;
  source: "jellyfin" | "sonarr" | "radarr";
}

export interface IndexerStatusItem {
  id: number;
  name: string;
  status: "ok" | "failing";
  latency: string;
}

export interface DownloadItem {
  id: string;
  name: string;
  progress: number;
  state: string;
  downloadSpeed: string;
  uploadSpeed: string;
  eta: string;
}

export interface SonarrSnapshot {
  seriesCount: number;
  episodeCount: number;
  missingCount: number;
  queue: QueueItem[];
  upcoming: UpcomingItem[];
  health: HealthIssue[];
  recentlyAdded: RecentMediaItem[];
}

export interface RadarrSnapshot {
  movieCount: number;
  availableCount: number;
  missingCount: number;
  queue: QueueItem[];
  upcoming: UpcomingItem[];
  health: HealthIssue[];
  recentlyAdded: RecentMediaItem[];
}

export interface JellyfinSnapshot {
  version: string;
  users: number;
  active: number;
  nowPlaying: NowPlayingItem[];
  recentlyAdded: RecentMediaItem[];
}

export interface JellyseerrSnapshot {
  pending: number;
  approved: number;
  available: number;
  requests: RequestItem[];
}

export interface ProwlarrSnapshot {
  total: number;
  healthy: number;
  failing: number;
  indexers: IndexerStatusItem[];
}

export interface DownloadClientSnapshot {
  active: number;
  downloading: number;
  seeding: number;
  downloadSpeed: string;
  uploadSpeed: string;
  items: DownloadItem[];
}

export interface ServiceRuntime {
  state: ServiceHealthState;
  lastSuccessAt: number | null;
  lastError: string | null;
  latencyMs: number | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface SaveConfigPayload {
  serviceType: MediaServiceType;
  url: string;
  apiKey: string;
  enabled: boolean;
}

export class MediaRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class MediaTimeoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}
