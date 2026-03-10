import { safeProxy, type RequestContext } from "@/services/media/proxy";
import { formatEta, formatRate } from "@/services/media/utils";
import type { DownloadClientSnapshot, ProwlarrSnapshot } from "@/types/media";

export const fetchProwlarrSnapshot = async (
  ctx: RequestContext,
): Promise<ProwlarrSnapshot> => {
  type ProwlarrIndexerStatus = {
    indexerId?: number;
    indexerName?: string;
    disabledTill?: string;
    failureMessage?: string;
    averageResponseTime?: number;
  };

  const payload = await safeProxy<ProwlarrIndexerStatus[]>(
    ctx,
    "prowlarr",
    "/api/v1/indexerstatus",
  );

  const indexers = (payload ?? []).map((item, index) => ({
    id: item.indexerId ?? index,
    name: item.indexerName || "Unknown",
    status: item.disabledTill || item.failureMessage ? "failing" as const : "ok" as const,
    latency: item.averageResponseTime != null ? `${item.averageResponseTime}ms` : "Unknown",
  }));

  return {
    total: indexers.length,
    healthy: indexers.filter((item) => item.status === "ok").length,
    failing: indexers.filter((item) => item.status === "failing").length,
    indexers,
  };
};

export const fetchQbittorrentSnapshot = async (
  ctx: RequestContext,
): Promise<DownloadClientSnapshot> => {
  type TransferInfo = {
    dl_info_speed?: number;
    up_info_speed?: number;
  };
  type TorrentInfo = {
    hash: string;
    name?: string;
    progress?: number;
    state?: string;
    dlspeed?: number;
    upspeed?: number;
    eta?: number;
  };

  const [transfer, torrents] = await Promise.all([
    safeProxy<TransferInfo>(ctx, "qbittorrent", "/api/v2/transfer/info"),
    safeProxy<TorrentInfo[]>(ctx, "qbittorrent", "/api/v2/torrents/info?sort=added_on&reverse=true"),
  ]);

  const items = (torrents ?? []).map((torrent) => ({
    id: torrent.hash,
    name: torrent.name || "Unknown",
    progress: Math.round((torrent.progress ?? 0) * 100),
    state: torrent.state || "unknown",
    downloadSpeed: formatRate(torrent.dlspeed),
    uploadSpeed: formatRate(torrent.upspeed),
    eta: formatEta(torrent.eta),
  }));

  return {
    active: items.length,
    downloading: items.filter((item) => item.state.toLowerCase().includes("down")).length,
    seeding: items.filter((item) => item.state.toLowerCase().includes("up") || item.state.toLowerCase().includes("seed")).length,
    downloadSpeed: formatRate(transfer?.dl_info_speed),
    uploadSpeed: formatRate(transfer?.up_info_speed),
    items,
  };
};
