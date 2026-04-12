import { Hono } from 'hono';
import { db } from '../db';
import { mediaConfigs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { decryptSecret, encryptSecret } from '../lib/crypto';

const media = new Hono();
type MediaConfigRecord = typeof mediaConfigs.$inferSelect;
type MediaConfigResponse = Omit<MediaConfigRecord, 'apiKey'> & { hasApiKey: boolean };

const toSafeMediaConfig = (config: MediaConfigRecord): MediaConfigResponse => ({
  id: config.id,
  hostId: config.hostId,
  serviceType: config.serviceType,
  url: config.url,
  enabled: config.enabled,
  hasApiKey: Boolean(config.apiKey),
});

const testPaths: Record<string, string> = {
  sonarr: "/api/v3/system/status",
  radarr: "/api/v3/system/status",
  jellyfin: "/System/Info",
  jellyseerr: "/api/v1/status",
  prowlarr: "/api/v1/system/status",
  qbittorrent: "/api/v2/transfer/info",
};

const normalizeServiceUrl = (value: string) => {
  const normalized = new URL(value);
  normalized.pathname = normalized.pathname.replace(/\/+$/, "");
  return normalized.toString();
};

const buildServiceUrl = (base: string, path: string, query?: string) => {
  const target = new URL(base);
  const basePath = target.pathname === "/" ? "" : target.pathname.replace(/\/+$/, "");
  target.pathname = `${basePath}${path}`;
  target.search = query || "";
  return target.toString();
};

const parseQbittorrentCredentials = (value: string) => {
  const separator = value.indexOf(":");
  if (separator <= 0) {
    throw new HTTPException(400, { message: "qBittorrent requires apiKey formatted as username:password" });
  }

  return {
    username: value.slice(0, separator),
    password: value.slice(separator + 1),
  };
};

const createProxyHeaders = async (serviceType: string, url: string, apiKey: string) => {
  const headers = new Headers();

  if (serviceType === "sonarr" || serviceType === "radarr" || serviceType === "jellyseerr" || serviceType === "prowlarr") {
    headers.set("X-Api-Key", apiKey);
    headers.set("Content-Type", "application/json");
    return headers;
  }

  if (serviceType === "jellyfin") {
    headers.set("X-Emby-Token", apiKey);
    headers.set("Content-Type", "application/json");
    return headers;
  }

  if (serviceType === "qbittorrent") {
    const { username, password } = parseQbittorrentCredentials(apiKey);
    const serviceUrl = new URL(url);
    const loginResponse = await fetch(buildServiceUrl(url, "/api/v2/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: url,
        Origin: serviceUrl.origin,
      },
      body: new URLSearchParams({ username, password }),
    });

    const loginText = await loginResponse.text();
    if (!loginResponse.ok || loginText.trim() !== "Ok.") {
      const loginMessage = loginText.trim() || loginResponse.statusText || "empty response";
      throw new HTTPException(401, { message: `qBittorrent authentication failed (${loginResponse.status}: ${loginMessage})` });
    }

    const cookie = loginResponse.headers.get("set-cookie");
    if (!cookie) {
      throw new HTTPException(401, { message: "qBittorrent session cookie missing" });
    }

    headers.set("Cookie", cookie.split(";")[0]);
    headers.set("Referer", url);
    headers.set("Origin", serviceUrl.origin);
    return headers;
  }

  headers.set("Content-Type", "application/json");
  return headers;
};

const proxyRequest = async ({
  serviceType,
  url,
  apiKey,
  method,
  path,
  query,
  body,
}: {
  serviceType: string;
  url: string;
  apiKey: string;
  method: string;
  path: string;
  query?: string;
  body?: string;
}) => {
  const headers = await createProxyHeaders(serviceType, url, apiKey);
  const response = await fetch(buildServiceUrl(url, path, query), {
    method,
    headers,
    body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new HTTPException(response.status as any, {
      message: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
  }

  return payload;
};

const resolveApiKey = async (
  hostId: number,
  serviceType: string,
  apiKey: string | undefined,
) => {
  if (typeof apiKey === "string" && apiKey.length > 0) {
    return apiKey;
  }

  const existing = await db
    .select()
    .from(mediaConfigs)
    .where(and(eq(mediaConfigs.hostId, hostId), eq(mediaConfigs.serviceType, serviceType)))
    .get();

  return decryptSecret(existing?.apiKey) || "";
};

// GET / - List all media configs for a host
media.get('/', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  if (isNaN(hostId)) throw new HTTPException(400, { message: 'Invalid host ID' });

  const configs = await db.select().from(mediaConfigs).where(eq(mediaConfigs.hostId, hostId));
  return c.json(configs.map(toSafeMediaConfig));
});

// POST / - Add or update a media config
media.post('/', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  if (Number.isNaN(hostId)) {
    throw new HTTPException(400, { message: 'Invalid host ID' });
  }
  const { serviceType, url, apiKey, enabled } = await c.req.json();

  if (!serviceType || !url) {
    throw new HTTPException(400, { message: 'Service type and URL are required' });
  }

  // Check if config exists
  const existing = await db
    .select()
    .from(mediaConfigs)
    .where(and(eq(mediaConfigs.hostId, hostId), eq(mediaConfigs.serviceType, serviceType)))
    .get();

  if (existing) {
    const nextApiKey =
      typeof apiKey === 'string' && apiKey.length > 0
        ? encryptSecret(apiKey) ?? ''
        : existing.apiKey;
    const updated = await db
      .update(mediaConfigs)
      .set({ url: normalizeServiceUrl(url), apiKey: nextApiKey, enabled: enabled ? 1 : 0 })
      .where(eq(mediaConfigs.id, existing.id))
      .returning();
    return c.json(toSafeMediaConfig(updated[0]));
  } else {
    const created = await db
      .insert(mediaConfigs)
      .values({
        hostId,
        serviceType,
        url: normalizeServiceUrl(url),
        apiKey: encryptSecret(apiKey || '') || '',
        enabled: enabled !== false ? 1 : 0,
      })
      .returning();
    return c.json(toSafeMediaConfig(created[0]), 201);
  }
});

// DELETE /:id - Remove a media config
media.delete('/:id', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  const id = Number(c.req.param('id'));
  if (Number.isNaN(hostId) || Number.isNaN(id)) {
    throw new HTTPException(400, { message: 'Invalid media config reference' });
  }

  const deleted = await db
    .delete(mediaConfigs)
    .where(and(eq(mediaConfigs.hostId, hostId), eq(mediaConfigs.id, id)))
    .returning();
  if (deleted.length === 0) throw new HTTPException(404, { message: 'Config not found' });
  return c.json({ message: 'Deleted', config: toSafeMediaConfig(deleted[0]) });
});

media.post('/test', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  if (Number.isNaN(hostId)) {
    throw new HTTPException(400, { message: 'Invalid host ID' });
  }

  const { serviceType, url, apiKey } = await c.req.json();

  if (!serviceType || !url) {
    throw new HTTPException(400, { message: 'Service type and URL are required' });
  }

  const path = testPaths[serviceType];
  if (!path) {
    throw new HTTPException(400, { message: 'Unsupported media service type' });
  }

  try {
    const resolvedApiKey = await resolveApiKey(hostId, serviceType, apiKey);
    await proxyRequest({
      serviceType,
      url: normalizeServiceUrl(url),
      apiKey: resolvedApiKey,
      method: 'GET',
      path,
    });

    return c.json({ success: true, message: 'Connection successful' });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      return c.json({ success: false, message: error.message }, error.status);
    }

    return c.json({ success: false, message: error.message || 'Connection failed' }, 500);
  }
});

media.all('/proxy/:serviceType/:any{.+}', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  const serviceType = c.req.param('serviceType');
  const path = '/' + c.req.param('any');
  const query = c.req.raw.url.split('?')[1] || '';

  const config = await db
    .select()
    .from(mediaConfigs)
    .where(and(eq(mediaConfigs.hostId, hostId), eq(mediaConfigs.serviceType, serviceType)))
    .get();

  if (!config || !config.enabled) {
    throw new HTTPException(404, { message: 'Service config not found or disabled' });
  }

  try {
    const payload = await proxyRequest({
      serviceType,
      url: normalizeServiceUrl(config.url),
      apiKey: decryptSecret(config.apiKey) || '',
      method: c.req.method,
      path,
      query,
      body: ['POST', 'PUT', 'PATCH'].includes(c.req.method) ? await c.req.text() : undefined,
    });

    return typeof payload === 'string' ? c.text(payload) : c.json(payload);
  } catch (error: any) {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }

    return c.json({ error: error.message }, 500);
  }
});

export default media;
