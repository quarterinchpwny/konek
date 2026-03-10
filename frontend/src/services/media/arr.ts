import { safeProxy, type RequestContext } from "@/services/media/proxy";
import { mapHealthIssues, parseDateInfo } from "@/services/media/utils";
import type { RadarrSnapshot, RecentMediaItem, SonarrSnapshot, UpcomingItem } from "@/types/media";

export const fetchSonarrSnapshot = async (
  ctx: RequestContext,
): Promise<SonarrSnapshot> => {
  type SonarrSeries = {
    id: number;
    title?: string;
    added?: string;
    statistics?: {
      episodeFileCount?: number;
    };
  };

  type SonarrQueueRecord = {
    id: number;
    title?: string;
    status?: string;
    size?: number;
    sizeleft?: number;
  };

  type SonarrCalendarRecord = {
    id: number;
    series?: { title?: string };
    seasonNumber?: number;
    episodeNumber?: number;
    airDate?: string;
  };

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const start = now.toISOString().split("T")[0];
  const end = nextWeek.toISOString().split("T")[0];

  const [series, missing, queue, calendar, health] = await Promise.all([
    safeProxy<SonarrSeries[]>(ctx, "sonarr", "/api/v3/series"),
    safeProxy<{ totalRecords?: number }>(ctx, "sonarr", "/api/v3/wanted/missing?pageSize=1"),
    safeProxy<{ records?: SonarrQueueRecord[] }>(ctx, "sonarr", "/api/v3/queue"),
    safeProxy<SonarrCalendarRecord[]>(ctx, "sonarr", `/api/v3/calendar?start=${start}&end=${end}`),
    safeProxy<Array<{ id?: number; type?: string; message?: string; sourceName?: string; level?: string }>>(
      ctx,
      "sonarr",
      "/api/v3/health",
    ),
  ]);

  const queueItems = (queue?.records ?? []).map((record) => {
    const total = record.size ?? 0;
    const left = record.sizeleft ?? total;
    const progress = total > 0 ? Math.round(((total - left) / total) * 100) : 0;

    return {
      id: record.id,
      title: record.title || "Unknown",
      status: record.status || "Downloading",
      progress: Math.max(0, Math.min(100, progress)),
    };
  });

  const upcoming: UpcomingItem[] = (calendar ?? []).map((item) => {
    const dateInfo = parseDateInfo(item.airDate);

    return {
      id: item.id,
      title: `${item.series?.title || "Unknown"} S${item.seasonNumber ?? 0}E${item.episodeNumber ?? 0}`,
      date: dateInfo.label,
      scheduledAt: dateInfo.timestamp,
      source: "sonarr",
    };
  });

  const recentlyAdded: RecentMediaItem[] = (series ?? [])
    .map((item) => {
      const added = parseDateInfo(item.added);
      return {
        id: `sonarr-${item.id}`,
        title: item.title || "Unknown",
        subtitle: "Series",
        addedAt: added.timestamp,
        addedAtLabel: added.label,
        source: "sonarr" as const,
      };
    })
    .filter((item) => item.addedAt != null);

  return {
    seriesCount: series?.length ?? 0,
    episodeCount: (series ?? []).reduce((sum, row) => sum + (row.statistics?.episodeFileCount ?? 0), 0),
    missingCount: missing?.totalRecords ?? 0,
    queue: queueItems,
    upcoming,
    health: mapHealthIssues("sonarr", health ?? []),
    recentlyAdded,
  };
};

export const fetchRadarrSnapshot = async (
  ctx: RequestContext,
): Promise<RadarrSnapshot> => {
  type RadarrMovie = {
    id: number;
    title?: string;
    added?: string;
    hasFile?: boolean;
    monitored?: boolean;
  };

  type RadarrQueueRecord = {
    id: number;
    title?: string;
    status?: string;
    size?: number;
    sizeleft?: number;
  };

  type RadarrCalendarRecord = {
    id: number;
    title?: string;
    inCinemas?: string;
    physicalRelease?: string;
  };

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const start = now.toISOString().split("T")[0];
  const end = nextMonth.toISOString().split("T")[0];

  const [movies, queue, calendar, health] = await Promise.all([
    safeProxy<RadarrMovie[]>(ctx, "radarr", "/api/v3/movie"),
    safeProxy<{ records?: RadarrQueueRecord[] }>(ctx, "radarr", "/api/v3/queue"),
    safeProxy<RadarrCalendarRecord[]>(ctx, "radarr", `/api/v3/calendar?start=${start}&end=${end}`),
    safeProxy<Array<{ id?: number; type?: string; message?: string; sourceName?: string; level?: string }>>(
      ctx,
      "radarr",
      "/api/v3/health",
    ),
  ]);

  const queueItems = (queue?.records ?? []).map((record) => {
    const total = record.size ?? 0;
    const left = record.sizeleft ?? total;
    const progress = total > 0 ? Math.round(((total - left) / total) * 100) : 0;

    return {
      id: record.id,
      title: record.title || "Unknown",
      status: record.status || "Downloading",
      progress: Math.max(0, Math.min(100, progress)),
    };
  });

  const upcoming: UpcomingItem[] = (calendar ?? []).map((item) => {
    const dateInfo = parseDateInfo(item.inCinemas || item.physicalRelease);

    return {
      id: item.id,
      title: item.title || "Unknown",
      date: dateInfo.label,
      scheduledAt: dateInfo.timestamp,
      source: "radarr",
    };
  });

  const movieList = movies ?? [];
  const recentlyAdded: RecentMediaItem[] = movieList
    .map((item) => {
      const added = parseDateInfo(item.added);
      return {
        id: `radarr-${item.id}`,
        title: item.title || "Unknown",
        subtitle: "Movie",
        addedAt: added.timestamp,
        addedAtLabel: added.label,
        source: "radarr" as const,
      };
    })
    .filter((item) => item.addedAt != null);

  return {
    movieCount: movieList.length,
    availableCount: movieList.filter((movie) => Boolean(movie.hasFile)).length,
    missingCount: movieList.filter((movie) => !movie.hasFile && Boolean(movie.monitored)).length,
    queue: queueItems,
    upcoming,
    health: mapHealthIssues("radarr", health ?? []),
    recentlyAdded,
  };
};
