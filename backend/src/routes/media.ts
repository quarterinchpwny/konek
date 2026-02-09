import { Hono } from 'hono';
import { db } from '../db';
import { mediaConfigs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

const media = new Hono();

// GET / - List all media configs for a host
media.get('/', async (c) => {
  const hostId = Number(c.req.param('hostId'));
  if (isNaN(hostId)) throw new HTTPException(400, { message: 'Invalid host ID' });

  const configs = await db.select().from(mediaConfigs).where(eq(mediaConfigs.hostId, hostId));
  return c.json(configs);
});

// POST / - Add or update a media config
media.post('/', async (c) => {
  const hostId = Number(c.req.param('hostId'));
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
    const updated = await db
      .update(mediaConfigs)
      .set({ url, apiKey, enabled: enabled ? 1 : 0 })
      .where(eq(mediaConfigs.id, existing.id))
      .returning();
    return c.json(updated[0]);
  } else {
    const created = await db
      .insert(mediaConfigs)
      .values({ hostId, serviceType, url, apiKey: apiKey || '', enabled: enabled !== false ? 1 : 0 })
      .returning();
    return c.json(created[0], 201);
  }
});

// DELETE /:id - Remove a media config
media.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const deleted = await db.delete(mediaConfigs).where(eq(mediaConfigs.id, id)).returning();
  if (deleted.length === 0) throw new HTTPException(404, { message: 'Config not found' });
  return c.json({ message: 'Deleted', config: deleted[0] });
});

// Proxy route for full API access
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
    let targetUrl = `${config.url}${path}${query ? '?' + query : ''}`;
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (serviceType === 'sonarr' || serviceType === 'radarr' || serviceType === 'jellyseerr') {
      headers['X-Api-Key'] = config.apiKey;
    } else if (serviceType === 'jellyfin') {
      headers['X-Emby-Token'] = config.apiKey;
    }

    const method = c.req.method;
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await c.req.text() : undefined;

    const response = await fetch(targetUrl, {
      method,
      headers,
      body
    });

    if (!response.ok) {
      const errText = await response.text();
      return c.json({ error: `Service returned ${response.status}: ${errText}` }, response.status as any);
    }

    const data = await response.json();
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default media;
