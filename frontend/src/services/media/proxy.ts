import { MediaRequestError, MediaTimeoutError, type MediaServiceType } from "@/types/media";

export interface RequestContext {
  baseUrl: string;
  hostId: number;
  signal: AbortSignal;
}

const serviceStatusPaths: Record<MediaServiceType, string> = {
  sonarr: "/api/v3/system/status",
  radarr: "/api/v3/system/status",
  jellyfin: "/System/Info",
  jellyseerr: "/api/v1/status",
  prowlarr: "/api/v1/system/status",
  qbittorrent: "/api/v2/transfer/info",
};

const withTimeout = (signal: AbortSignal, timeoutMs: number) => {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", onAbort);

  const timeout = window.setTimeout(() => {
    controller.abort(new MediaTimeoutError("Request timed out"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
    },
  };
};

export const fetchProxy = async <T>(
  ctx: RequestContext,
  service: MediaServiceType,
  path: string,
  timeoutMs = 8000,
): Promise<T> => {
  const { signal, cleanup } = withTimeout(ctx.signal, timeoutMs);

  try {
    const response = await fetch(
      `${ctx.baseUrl}/hosts/${ctx.hostId}/media/proxy/${service}${path}`,
      { signal },
    );

    if (!response.ok) {
      throw new MediaRequestError(`${service} request failed`, response.status);
    }

    const contentType = response.headers.get("content-type") || "";
    return (
      contentType.includes("application/json")
        ? await response.json()
        : await response.text()
    ) as T;
  } catch (error) {
    if (signal.aborted && signal.reason instanceof MediaTimeoutError) {
      throw signal.reason;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw error;
  } finally {
    cleanup();
  }
};

export const safeProxy = async <T>(
  ctx: RequestContext,
  service: MediaServiceType,
  path: string,
  timeoutMs = 8000,
): Promise<T | null> => {
  try {
    return await fetchProxy<T>(ctx, service, path, timeoutMs);
  } catch {
    return null;
  }
};

export const probeService = async (
  ctx: RequestContext,
  service: MediaServiceType,
) => {
  const started = performance.now();
  await fetchProxy<unknown>(ctx, service, serviceStatusPaths[service], 5000);
  return Math.round(performance.now() - started);
};
