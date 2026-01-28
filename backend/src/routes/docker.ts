import { Hono } from "hono";
import { sessions } from "../services/session";
import { exec } from "../lib/ssh-utils";

const dockerRoute = new Hono();

const dockerAction = async (
  sessionId: string,
  containerId: string,
  action: "start" | "stop" | "restart"
) => {
  if (!sessionId || !sessions.has(sessionId)) {
    throw new Error("Session not found or disconnected");
  }
  const session = sessions.get(sessionId)!;
  session.lastActive = Date.now();

  // Basic validation for container ID (alphanumeric, dashes, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(containerId)) {
    throw new Error("Invalid container ID format");
  }

  const cmd = `docker ${action} ${containerId}`;
  return await exec(session.client, cmd);
};

dockerRoute.post("/:containerId/start", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(sessionId, containerId, "start");
    return c.json({ message: "Container started successfully", output });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

dockerRoute.post("/:containerId/stop", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(sessionId, containerId, "stop");
    return c.json({ message: "Container stopped successfully", output });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

dockerRoute.post("/:containerId/restart", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(sessionId, containerId, "restart");
    return c.json({ message: "Container restarted successfully", output });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

dockerRoute.get("/:containerId/logs", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const tail = c.req.query("tail") || "100";

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);
  if (!sessions.has(sessionId)) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  // Basic validation
  if (!/^[a-zA-Z0-9_-]+$/.test(containerId) || !/^\d+$/.test(tail)) {
    return c.json({ error: "Invalid parameter format" }, 400);
  }

  const session = sessions.get(sessionId)!;
  session.lastActive = Date.now();

  try {
    const cmd = `docker logs --tail ${tail} ${containerId}`;
    const output = await exec(session.client, cmd);
    return c.json({ logs: output });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default dockerRoute;
