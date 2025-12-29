import { Hono } from "hono";
import { Client as SSHClient } from "ssh2";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { serverHosts } from "../db/schema";
import { sessions } from "../services/session";

const terminalRoute = new Hono();

/**
 * POST /api/connect
 */
terminalRoute.post("/connect", async (c) => {
  const { hostId } = await c.req.json();

  const [host] = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, hostId));

  if (!host) {
    return c.json({ error: "Host not found" }, 404);
  }

  return new Promise((resolve) => {
    const client = new SSHClient();
    const sessionId = uuidv4();

    client.on("ready", () => {
      sessions.set(sessionId, {
        client,
        isConnected: true,
        lastActive: Date.now(),
        host: host.hostname,
      });

      resolve(
        c.json({
          status: "success",
          sessionId,
        })
      );
    });

    client.on("error", (e) => {
      resolve(
        c.json(
          {
            status: "error",
            message: e.message,
          },
          500
        )
      );
    });

    try {
      client.connect({
        host: host.hostname,
        port: host.port || 22,
        username: host.username,
        password: host.password || undefined,
      });
    } catch (e: any) {
      resolve(c.json({ error: e.message }, 500));
    }
  });
});

/**
 * POST /api/disconnect
 */
terminalRoute.post("/disconnect", async (c) => {
  const { sessionId } = await c.req.json();

  const session = sessions.get(sessionId);

  if (session) {
    session.client.end();
    sessions.delete(sessionId);
  }

  return c.json({ status: "disconnected" });
});

export default terminalRoute;
