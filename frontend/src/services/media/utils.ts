import type { HealthIssue, RecentMediaItem } from "@/types/media";

export const parseDateInfo = (value: string | null | undefined) => {
  if (!value) {
    return { label: "Unknown", timestamp: null as number | null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: "Unknown", timestamp: null as number | null };
  }

  return { label: date.toLocaleDateString(), timestamp: date.getTime() };
};

export const formatRate = (bytesPerSecond: number | null | undefined) => {
  const value = bytesPerSecond ?? 0;
  if (value <= 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
};

export const formatEta = (seconds: number | null | undefined) => {
  const value = seconds ?? -1;
  if (value < 0 || !Number.isFinite(value)) return "Unknown";
  if (value === 8640000) return "Queued";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(0, minutes)}m`;
};

export const mapHealthIssues = (
  source: "sonarr" | "radarr",
  payload: Array<{ id?: number; type?: string; message?: string; sourceName?: string; typeName?: string; level?: string }>,
): HealthIssue[] => {
  return payload.map((item, index) => ({
    id: `${source}-${item.id ?? index}`,
    source,
    level: item.level === "info" ? "info" : item.level === "warning" ? "warning" : "error",
    message: item.message || item.sourceName || item.typeName || "Health issue",
    type: item.type || item.typeName || "warning",
  }));
};

export const sortRecentMedia = (entries: RecentMediaItem[]) => {
  return [...entries].sort((a, b) => {
    if (a.addedAt == null && b.addedAt == null) return 0;
    if (a.addedAt == null) return 1;
    if (b.addedAt == null) return -1;
    return b.addedAt - a.addedAt;
  });
};
