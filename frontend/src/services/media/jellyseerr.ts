import { safeProxy, type RequestContext } from "@/services/media/proxy";
import type { JellyseerrSnapshot } from "@/types/media";

const pickLookupTitle = <T extends { title?: string }>(payload: T[] | T | null) => {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    const match = payload.find((item) => Boolean(item?.title?.trim()));
    return match?.title?.trim() || null;
  }

  return payload.title?.trim() || null;
};

const lookupRadarrTitle = async (ctx: RequestContext, tmdbId: number) => {
  const termPayload = await safeProxy<Array<{ title?: string }>>(
    ctx,
    "radarr",
    `/api/v3/movie/lookup?term=${encodeURIComponent(`tmdb:${tmdbId}`)}`,
    5000,
  );
  const termTitle = pickLookupTitle(termPayload);
  if (termTitle) return termTitle;

  const directPayload = await safeProxy<Array<{ title?: string }> | { title?: string }>(
    ctx,
    "radarr",
    `/api/v3/movie/lookup/${tmdbId}`,
    5000,
  );
  return pickLookupTitle(directPayload);
};

const lookupSonarrTitle = async (ctx: RequestContext, tmdbId: number, tvdbId?: number) => {
  const tmdbPayload = await safeProxy<Array<{ title?: string }>>(
    ctx,
    "sonarr",
    `/api/v3/series/lookup?term=${encodeURIComponent(`tmdb:${tmdbId}`)}`,
    5000,
  );
  const tmdbTitle = pickLookupTitle(tmdbPayload);
  if (tmdbTitle) return tmdbTitle;
  if (!tvdbId) return null;

  const tvdbPayload = await safeProxy<Array<{ title?: string }>>(
    ctx,
    "sonarr",
    `/api/v3/series/lookup?term=${encodeURIComponent(`tvdb:${tvdbId}`)}`,
    5000,
  );
  return pickLookupTitle(tvdbPayload);
};

const resolveRequestTitle = async (
  ctx: RequestContext,
  media: { title?: string; mediaType?: "movie" | "tv"; tmdbId?: number; tvdbId?: number } | undefined,
) => {
  const existing = media?.title?.trim();
  if (existing) return existing;
  const tmdbId = media?.tmdbId;
  if (!tmdbId) return "Unknown";

  if (media?.mediaType === "tv") {
    return (await lookupSonarrTitle(ctx, tmdbId, media.tvdbId))
      || (await lookupRadarrTitle(ctx, tmdbId))
      || "Unknown";
  }

  return (await lookupRadarrTitle(ctx, tmdbId))
    || (await lookupSonarrTitle(ctx, tmdbId, media?.tvdbId))
    || "Unknown";
};

export const fetchJellyseerrSnapshot = async (
  ctx: RequestContext,
): Promise<JellyseerrSnapshot> => {
  type JellyseerrRequest = {
    id: number;
    status: number;
    createdAt?: string;
    requestedBy?: { displayName?: string; email?: string; username?: string };
    media?: {
      title?: string;
      mediaType?: "movie" | "tv";
      tmdbId?: number;
      tvdbId?: number;
    };
  };

  const payload = await safeProxy<{ results?: JellyseerrRequest[] }>(
    ctx,
    "jellyseerr",
    "/api/v1/request?take=20&skip=0&sort=added",
  );

  const requests = payload?.results ?? [];
  const toRequestStatus = (status: number): "Pending" | "Approved" | "Available" => (
    status === 1 ? "Pending" : status === 2 ? "Approved" : "Available"
  );

  const requestItems = await Promise.all(
    requests.map(async (request) => ({
      id: request.id,
      title: await resolveRequestTitle(ctx, request.media),
      status: toRequestStatus(request.status),
      requestedBy: request.requestedBy?.displayName || request.requestedBy?.username || request.requestedBy?.email,
      createdAt: request.createdAt ? new Date(request.createdAt).toLocaleDateString() : undefined,
      mediaType: request.media?.mediaType,
    })),
  );

  return {
    pending: requests.filter((request) => request.status === 1).length,
    approved: requests.filter((request) => request.status === 2).length,
    available: requests.filter((request) => request.status === 3).length,
    requests: requestItems,
  };
};
