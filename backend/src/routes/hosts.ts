import { Hono } from "hono";
import { db } from "../db";
import { serverHosts } from "../db/schema";
import { eq } from "drizzle-orm";
import { tcpPing } from "../lib/network";
import { statusStore, pollingService } from "../services/monitor";

const hostsRoute = new Hono();
/**
 * GET /api/hosts
 */
hostsRoute.get("/", async (c) => {
  const hosts = await db.select().from(serverHosts);

  const result = hosts.map((h) => {
    const liveStatus = statusStore.get(h.id);

    if (!liveStatus) {
      pollingService.start(h.id);
    }

    return {
      alias: h.alias,
      hostname: h.hostname,
      port: h.port,
      id: h.id,
      username: h.username,
      status: liveStatus?.status || "checking...",
      lastChecked: liveStatus?.lastChecked
        ? new Date(liveStatus.lastChecked).toISOString()
        : null,
    };
  });

  return c.json(result);
});
/**
 * POST /api/hosts
 */
hostsRoute.post("/", async (c) => {
  try {
    const { alias, hostname, port, username, password } = await c.req.json();

    if (!alias || !hostname || !username) {
      return c.json(
        { error: "Missing required fields: alias, hostname, username" },
        400
      );
    }

    const newHost = await db
      .insert(serverHosts)
      .values({
        alias,
        hostname,
        port: port || 22,
        username,
        password,
      })
      .returning();

    return c.json(newHost[0], 201);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE")) {
      return c.json({ error: "Host with this hostname already exists." }, 409);
    }

    console.error("Error saving host:", error);
    return c.json({ error: "Failed to save host information" }, 500);
  }
});
/**
 * GET /api/check-online/:id
 */
hostsRoute.get("/check-online/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const hostData = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, id))
    .get();

  if (!hostData) {
    return c.json({ error: "Host not found" }, 404);
  }

  const isOnline = await tcpPing(hostData.hostname, hostData.port || 22);

  return c.json({
    host: hostData.alias,
    online: isOnline,
    lastChecked: new Date().toISOString(),
  });
});

export default hostsRoute;
