import { Hono } from "hono";
import { db } from "../db";
import { serverHosts } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { tcpPing } from "../lib/network";
import {
  statusStore,
  pollingService,
  metricsStore,
} from "../services/monitor";
import { wake } from "wake_on_lan";

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
      macAddress: h.macAddress,
      sshEnabled: h.sshEnabled,
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
    const { alias, hostname, port, username, password, macAddress, sshEnabled } = await c.req.json();

    if (!alias || !hostname || (sshEnabled && !username)) {
      return c.json(
        { error: "Missing required fields: alias, hostname, and username (if SSH is enabled)" },
        400
      );
    }

    const newHost = await db
      .insert(serverHosts)
      .values({
        alias,
        hostname,
        port: port || 22,
        username: sshEnabled ? username : 'none',
        password,
        macAddress,
        sshEnabled: sshEnabled ? 1 : 0,
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

hostsRoute.put("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const { alias, hostname, port, username, password, macAddress, sshEnabled } = await c.req.json();

    if (!alias || !hostname || (sshEnabled && !username)) {
      return c.json(
        { error: "Missing required fields: alias, hostname, and username (if SSH is enabled)" },
        400
      );
    }

    const updatedData: any = {
      alias,
      hostname,
      port: port || 22,
      username: sshEnabled ? username : 'none',
      macAddress,
      sshEnabled: sshEnabled ? 1 : 0,
    };

    // Only update password if it's not an empty string
    if (password) {
      updatedData.password = password;
    }

    const updatedHost = await db
      .update(serverHosts)
      .set(updatedData)
      .where(eq(serverHosts.id, id))
      .returning();

    if (updatedHost.length === 0) {
      return c.json({ error: "Host not found" }, 404);
    }

    return c.json(updatedHost[0]);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE")) {
      return c.json({ error: "Host with this hostname already exists." }, 409);
    }

    console.error("Error updating host:", error);
    return c.json({ error: "Failed to update host information" }, 500);
  }
});

/**
 * POST /api/hosts/:id/wol
 */
hostsRoute.post("/:id/wol", async (c) => {
  try {
    const id = Number(c.req.param("id"));

    const hostData = await db
      .select()
      .from(serverHosts)
      .where(eq(serverHosts.id, id))
      .get();

    if (!hostData) {
      return c.json({ error: "Host not found" }, 404);
    }

    if (!hostData.macAddress) {
      return c.json({ error: "MAC address not configured for this host" }, 400);
    }

    wake(hostData.macAddress, (error) => {
      if (error) {
        console.error(`Error sending WOL packet to ${hostData.macAddress}:`, error);
        return c.json({ error: "Failed to send WOL packet" }, 500);
      } else {
        console.log(`WOL packet sent to ${hostData.macAddress}`);
        return c.json({ message: "WOL packet sent successfully" });
      }
    });

    // Hono expects a promise or direct response. The wake callback is async.
    // Wrap it in a Promise to handle the async nature correctly.
    return new Promise((resolve) => {
      wake(hostData.macAddress, (error) => {
        if (error) {
          console.error(`Error sending WOL packet to ${hostData.macAddress}:`, error);
          resolve(c.json({ error: "Failed to send WOL packet" }, 500));
        } else {
          console.log(`WOL packet sent to ${hostData.macAddress}`);
          resolve(c.json({ message: "WOL packet sent successfully" }));
        }
      });
    });

  } catch (error) {
    console.error("Error in WOL request:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * DELETE /api/hosts
 */
hostsRoute.delete("/:id", async (c) => {
  try {
    // 2. CHANGE THIS: Get ID from the URL params, NOT c.req.json()
    const id = c.req.param("id"); 

    if (!id) {
      return c.json({ error: "Missing ID in URL" }, 400);
    }

    const hostId = Number(id);

    // 3. Delete from DB
    const deletedHost = await db
      .delete(serverHosts)
      .where(eq(serverHosts.id, hostId))
      .returning();

    if (deletedHost.length === 0) {
      return c.json({ error: "Host not found" }, 404);
    }

    return c.json({ message: "Deleted", host: deletedHost[0] }, 200);
  } catch (error: any) {
    console.error("Delete error:", error);
    return c.json({ error: "Server error" }, 500);
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

/**
 * POST /api/hosts/check-online/bulk
 */
hostsRoute.post("/check-online/bulk", async (c) => {
  const { ids } = await c.req.json<{ ids: number[] }>();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "Missing or invalid 'ids' in request body" }, 400);
  }

  const hosts = await db
    .select()
    .from(serverHosts)
    .where(inArray(serverHosts.id, ids));

  const results = await Promise.all(
    hosts.map(async (host) => {
      const isOnline = await tcpPing(host.hostname, host.port || 22);
      const status = statusStore.get(host.id);

      let stats = {};
      if (isOnline) {
        stats = metricsStore.get(host.id) || {};
      }

      if (!status) {
        pollingService.start(host.id);
      }

      return {
        id: host.id,
        alias: host.alias,
        hostname: host.hostname,
        port: host.port,
        username: host.username,
        macAddress: host.macAddress,
        online: isOnline,
        lastChecked: new Date().toISOString(),
        status: status?.status || "checking...",
        stats,
      };
    })
  );

  const resultsMap = new Map(results.map((r) => [r.id, r]));

  const finalResults = ids.map((id) => {
    if (resultsMap.has(id)) {
      return resultsMap.get(id);
    }
    return {
      id,
      error: "Host not found",
      status: "error",
    };
  });

  return c.json(finalResults);
});

export default hostsRoute;

