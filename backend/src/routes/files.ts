import { Hono } from "hono";
import { sessions } from "../services/session";

const filesRoute = new Hono();

/**
 * GET /api/files/list
 */
filesRoute.get("/list", async (c) => {
  const sessionId = c.req.query("sessionId");
  const path = c.req.query("path") || "/";

  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  const session = sessions.get(sessionId)!;
  session.lastActive = Date.now();

  return new Promise((resolve) => {
    const cmd = `ls -la --time-style=long-iso "${path}"`;

    session.client.exec(cmd, (err, stream) => {
      if (err) {
        return resolve(c.json({ error: err.message }, 500));
      }

      let output = "";

      stream.on("data", (data: Buffer) => {
        output += data.toString();
      });

      stream.on("close", (code: number) => {
        if (code !== 0) {
          return resolve(c.json({ error: "Command failed" }, 500));
        }

        // Simple ls parser
        const lines = output.split("\n").slice(1);

        const files = lines
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const parts = line.split(/\s+/);
            const permissions = parts[0];
            const name = parts.slice(7).join(" ");

            return {
              name,
              permissions,
              isDirectory: permissions.startsWith("d"),
              size: parts[4],
              path: path === "/" ? `/${name}` : `${path}/${name}`,
            };
          })
          .filter((f) => f.name !== "." && f.name !== "..");

        resolve(c.json({ path, files }));
      });
    });
  });
});

/**
 * GET /api/files/read
 */
filesRoute.get("/read", async (c) => {
  const sessionId = c.req.query("sessionId");
  const filePath = c.req.query("path");

  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: "No session" }, 401);
  }

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  const session = sessions.get(sessionId)!;

  return new Promise((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err || !sftp) {
        return resolve(c.json({ error: "SFTP not available" }, 500));
      }

      const stream = sftp.createReadStream(filePath);
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => chunks.push(chunk));

      stream.on("end", () => {
        resolve(
          c.json({
            content: Buffer.concat(chunks).toString("utf-8"),
          })
        );
      });

      stream.on("error", (e: Error) => {
        resolve(c.json({ error: e.message }, 500));
      });
    });
  });
});

export default filesRoute;
