import { Hono } from "hono";
import { Client as SSHClient } from "ssh2";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db } from "../db";
import { serverHosts } from "../db/schema";
import { decryptSecret } from "../lib/crypto";
import {
  createPersistentTerminalSession,
  ensurePersistentTerminalAvailable,
  getPersistentTerminalSocketName,
  killPersistentTerminalSession,
} from "../lib/persistent-terminal";
import { getRequestAuthSessionId } from "../middleware/auth";
import { getOwnedSession, sessions } from "../services/session";
import {
  clearTerminalTabs,
  createTerminalTab,
  deleteTerminalTab,
  getTerminalTab,
  listTerminalTabs,
} from "../services/terminal-tabs";

const terminalRoute = new Hono();

/**
 * POST /api/terminal/connect
 */
terminalRoute.post("/connect", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { hostId } = await c.req.json();

  const [host] = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, hostId));

  if (!host) {
    return c.json({ error: "Host not found" }, 404);
  }

  return new Promise<Response>((resolve) => {
    const client = new SSHClient();
    const sessionId = uuidv4();

    client.on("ready", () => {
      sessions.set(sessionId, {
        client,
        isConnected: true,
        lastActive: Date.now(),
        host: host.hostname,
        hostId: host.id,
        ownerId,
      });

      resolve(
        c.json({
          status: "success",
          sessionId,
        })
      );
    });

    client.on("close", () => {
      sessions.delete(sessionId);
      clearTerminalTabs(sessionId);
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
        password: decryptSecret(host.password) || undefined,
      });
    } catch (e: any) {
      resolve(c.json({ error: e.message }, 500));
    }
  });
});

/**
 * GET /api/terminal/validate
 */
terminalRoute.get("/validate", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.json({ status: "error", message: "Invalid session" }, 401);
  }
  const session = getOwnedSession(sessionId, getRequestAuthSessionId(c));
  return c.json({ status: "success", host: session.host });
});

/**
 * GET /api/terminal/sessions
 */
terminalRoute.get("/sessions", async (c) => {
  const hostId = c.req.query("hostId");
  const ownerId = getRequestAuthSessionId(c);
  if (!hostId) return c.json({ sessions: [] });

  const [host] = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, parseInt(hostId)));

  if (!host) return c.json({ sessions: [] });

  const activeSessions = Array.from(sessions.entries())
    .filter(([_, s]) => s.host === host.hostname && s.ownerId === ownerId)
    .map(([id, s]) => ({ sessionId: id, host: s.host }));

  return c.json({ sessions: activeSessions });
});

terminalRoute.get("/tabs", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    throw new HTTPException(400, { message: "sessionId is required" });
  }

  getOwnedSession(sessionId, ownerId);
  return c.json({ tabs: listTerminalTabs(sessionId) });
});

terminalRoute.post("/tabs", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, name } = await c.req.json<{
    sessionId?: string;
    name?: string;
  }>();

  if (!sessionId) {
    throw new HTTPException(400, { message: "sessionId is required" });
  }

  const session = getOwnedSession(sessionId, ownerId);
  const socketName = getPersistentTerminalSocketName(sessionId);
  let createdTabId: string | null = null;

  try {
    await ensurePersistentTerminalAvailable(session.client);
    const tab = createTerminalTab(sessionId, name);
    createdTabId = tab.id;
    await createPersistentTerminalSession(session.client, socketName, tab.sessionName);
    return c.json({ tab });
  } catch (error) {
    if (createdTabId) {
      deleteTerminalTab(sessionId, createdTabId);
    }
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to create terminal tab",
      },
      500,
    );
  }
});

terminalRoute.post("/tabs/close", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, terminalTabId } = await c.req.json<{
    sessionId?: string;
    terminalTabId?: string;
  }>();

  if (!sessionId || !terminalTabId) {
    throw new HTTPException(400, { message: "sessionId and terminalTabId are required" });
  }

  const session = getOwnedSession(sessionId, ownerId);
  const tab = getTerminalTab(sessionId, terminalTabId);
  const socketName = getPersistentTerminalSocketName(sessionId);

  try {
    await killPersistentTerminalSession(session.client, socketName, tab.sessionName);
  } finally {
    deleteTerminalTab(sessionId, terminalTabId);
  }

  return c.json({ status: "closed" });
});

/**
 * POST /api/terminal/execute
 */
terminalRoute.post("/execute", async (c) => {
  getRequestAuthSessionId(c);
  const { hostId, command } = await c.req.json();
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new HTTPException(400, { message: "Command is required" });
  }

  const [host] = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, hostId));

  if (!host) {
    return c.json({ error: "Host not found" }, 404);
  }

  return new Promise<Response>((resolve) => {
    const client = new SSHClient();
    let output = "";
    let errorOutput = "";

    client.on("ready", () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end();
          return resolve(c.json({ status: "error", message: err.message }, 500));
        }

        stream
          .on("data", (data: Buffer) => {
            output += data.toString();
          })
          .on("exit", (code: number) => {
            client.end();
            resolve(c.json({ status: "success", output, error: errorOutput, exitCode: code }));
          })
          .on("close", () => {
            // In case 'exit' is not emitted for some reason
            if (!stream.readableEnded) {
                client.end();
                resolve(c.json({ status: "success", output, error: errorOutput, exitCode: null }));
            }
          })
          .stderr.on("data", (data: Buffer) => {
            errorOutput += data.toString();
          });
      });
    });

    client.on("error", (e) => {
      resolve(
        c.json(
          {
            status: "error",
            message: `SSH connection error: ${e.message}`,
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
        password: decryptSecret(host.password) || undefined,
      });
    } catch (e: any) {
      resolve(c.json({ status: "error", message: `Failed to connect: ${e.message}` }, 500));
    }
  });
});

/**
 * POST /api/terminal/disconnect
 */
terminalRoute.post("/disconnect", async (c) => {
  const { sessionId } = await c.req.json();
  const session = sessionId
    ? sessions.get(sessionId)
    : undefined;

  if (session && session.ownerId === getRequestAuthSessionId(c)) {
    const terminalTabs = clearTerminalTabs(sessionId);
    const socketName = getPersistentTerminalSocketName(sessionId);
    await Promise.allSettled(
      terminalTabs.map((tab) =>
        killPersistentTerminalSession(session.client, socketName, tab.sessionName),
      ),
    );
    session.client.end();
    sessions.delete(sessionId);
  }

  return c.json({ status: "disconnected" });
});

export default terminalRoute;
