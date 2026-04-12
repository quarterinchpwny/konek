import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getRequestAuthSessionId } from "../middleware/auth";
import { assertDockerIdentifier } from "../lib/shell";
import { getOwnedSession } from "../services/session";
import { exec } from "../lib/ssh-utils";

const dockerRoute = new Hono();

const dockerAction = async (
  ownerId: string,
  sessionId: string,
  containerId: string,
  action: "start" | "stop" | "restart"
) => {
  const session = getOwnedSession(sessionId, ownerId);
  assertDockerIdentifier(containerId);

  const cmd = `docker ${action} ${containerId}`;
  return await exec(session.client, cmd);
};

dockerRoute.post("/:containerId/start", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const ownerId = getRequestAuthSessionId(c);

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(ownerId, sessionId, containerId, "start");
    return c.json({ message: "Container started successfully", output });
  } catch (e: any) {
    const status = e instanceof HTTPException ? e.status : 500;
    return c.json({ error: e.message }, status);
  }
});

dockerRoute.post("/:containerId/stop", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const ownerId = getRequestAuthSessionId(c);

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(ownerId, sessionId, containerId, "stop");
    return c.json({ message: "Container stopped successfully", output });
  } catch (e: any) {
    const status = e instanceof HTTPException ? e.status : 500;
    return c.json({ error: e.message }, status);
  }
});

dockerRoute.post("/:containerId/restart", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const ownerId = getRequestAuthSessionId(c);

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);

  try {
    const output = await dockerAction(ownerId, sessionId, containerId, "restart");
    return c.json({ message: "Container restarted successfully", output });
  } catch (e: any) {
    const status = e instanceof HTTPException ? e.status : 500;
    return c.json({ error: e.message }, status);
  }
});

dockerRoute.get("/:containerId/logs", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const tail = c.req.query("tail") || "100";
  const ownerId = getRequestAuthSessionId(c);

  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);
  if (!/^\d+$/.test(tail)) {
    return c.json({ error: "Invalid parameter format" }, 400);
  }

  const session = getOwnedSession(sessionId, ownerId);
  assertDockerIdentifier(containerId);

  try {
    const cmd = `docker logs --tail ${tail} ${containerId}`;
    const output = await exec(session.client, cmd);
    return c.json({ logs: output });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }

});
dockerRoute.get("/:containerId/logs/stream", async (c) => {
  const sessionId = c.req.query("sessionId");
  const { containerId } = c.req.param();
  const ownerId = getRequestAuthSessionId(c);

  if (!sessionId) return c.text("sessionId is required", 400);
  const session = getOwnedSession(sessionId, ownerId);
  assertDockerIdentifier(containerId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const proc = session.client.exec(
          `docker logs -f --tail=50 ${containerId}`,
          (err, stream) => {
            if (err) {
              controller.enqueue(encoder.encode(`data: ${err.message}\n\n`));
              controller.close();
              return;
            }

            stream.on("data", (chunk: Buffer) => {
              controller.enqueue(
                encoder.encode(`data: ${chunk.toString()}\n\n`)
              );
            });

            stream.stderr.on("data", (chunk: Buffer) => {
              controller.enqueue(
                encoder.encode(`data: ${chunk.toString()}\n\n`)
              );
            });

            stream.on("close", () => controller.close());
          }
        );

        c.req.raw.signal.addEventListener("abort", () => {
          proc?.end?.();
          controller.close();
        });
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${e.message}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});


export default dockerRoute;
