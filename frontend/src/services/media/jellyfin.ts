import { safeProxy, type RequestContext } from "@/services/media/proxy";
import { parseDateInfo } from "@/services/media/utils";
import type { JellyfinSnapshot } from "@/types/media";

export const fetchJellyfinSnapshot = async (
  ctx: RequestContext,
): Promise<JellyfinSnapshot> => {
  type JellyfinInfo = { Version?: string };
  type JellyfinSession = {
    Id: string;
    UserName?: string;
    NowPlayingItem?: { Name?: string };
  };
  type JellyfinLatestItem = {
    Id: string;
    Name?: string;
    SeriesName?: string;
    DateCreated?: string;
  };

  const [info, sessions, latest] = await Promise.all([
    safeProxy<JellyfinInfo>(ctx, "jellyfin", "/System/Info"),
    safeProxy<JellyfinSession[]>(ctx, "jellyfin", "/Sessions"),
    safeProxy<JellyfinLatestItem[]>(ctx, "jellyfin", "/Items/Latest?Limit=10"),
  ]);

  const sessionList = sessions ?? [];

  return {
    version: info?.Version || "",
    users: sessionList.length,
    active: sessionList.filter((session) => Boolean(session.NowPlayingItem)).length,
    nowPlaying: sessionList
      .filter((session) => Boolean(session.NowPlayingItem))
      .map((session) => ({
        id: session.Id,
        title: session.NowPlayingItem?.Name || "Unknown",
        user: session.UserName || "Unknown",
      })),
    recentlyAdded: (latest ?? []).map((item) => {
      const added = parseDateInfo(item.DateCreated);
      return {
        id: item.Id,
        title: item.Name || "Unknown",
        subtitle: item.SeriesName || "Jellyfin",
        addedAt: added.timestamp,
        addedAtLabel: added.label,
        source: "jellyfin" as const,
      };
    }),
  };
};
