import {
  MediaRequestError,
  MediaTimeoutError,
  type MediaServiceType,
  type ServiceRuntime,
  type ServiceHealthState,
} from "@/types/media";

export const classifyMediaError = (error: unknown): ServiceHealthState => {
  if (error instanceof MediaTimeoutError) {
    return "timeout";
  }

  if (error instanceof MediaRequestError) {
    if (error.status === 401 || error.status === 403) {
      return "auth_error";
    }

    if (error.status >= 500) {
      return "degraded";
    }
  }

  return "offline";
};

export const stringifyMediaError = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Service request failed";
};

export const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === "AbortError";
};

export const formatStatusText = (runtimeMap: Record<MediaServiceType, ServiceRuntime>, type: MediaServiceType) => {
  const state = runtimeMap[type].state;
  if (state === "auth_error") return "Auth Error";
  if (state === "timeout") return "Timeout";
  if (state === "degraded") return "Degraded";
  if (state === "disabled") return "Disabled";
  if (state === "checking") return "Checking";
  if (state === "unknown") return "Unknown";
  if (state === "online") return "Online";
  return "Offline";
};

export const formatServiceMeta = (runtimeMap: Record<MediaServiceType, ServiceRuntime>, type: MediaServiceType) => {
  const runtime = runtimeMap[type];
  if (runtime.lastError && runtime.state !== "online") {
    return runtime.lastError;
  }

  if (runtime.lastSuccessAt) {
    const ageSeconds = Math.floor((Date.now() - runtime.lastSuccessAt) / 1000);
    if (ageSeconds > 90) {
      return `stale ${Math.floor(ageSeconds / 60)}m ago`;
    }
  }

  if (runtime.latencyMs != null && runtime.state === "online") {
    return `${runtime.latencyMs}ms`;
  }

  return "";
};
