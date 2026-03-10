import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { IncomingMessage, Server as HttpServer } from "node:http";
import { RawData, WebSocketServer } from "ws";

import { getAuthSession } from "./services/auth";
import { requireAuth } from "./middleware/auth";
import { assertDockerIdentifier, assertTmuxSessionName } from "./lib/shell";
import { sessions } from "./services/session";
import authRoute from "./routes/auth";
import hostsRoute from "./routes/hosts";
import filesRoute from "./routes/files";
import terminalRoute from "./routes/terminal";
import statsRoute from "./routes/stats";
import dockerRoute from "./routes/docker";
import activityRoute from "./routes/activity";
import networkRoute from "./routes/network";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type"],
  })
);

app.use("/api/*", requireAuth);
app.route("/api/auth", authRoute);

app.route("/api/hosts", hostsRoute);
app.route("/api/files", filesRoute);
app.route("/api/docker", dockerRoute);
app.route("/api/terminal", terminalRoute);
app.route("/api/stats", statsRoute);
app.route("/api/activity", activityRoute);
app.route("/api/network", networkRoute);

const port = 3000;

const server = serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
}) as HttpServer;

const extractWebSocketToken = (request: IncomingMessage) => {
  const protocols = request.headers["sec-websocket-protocol"];
  if (!protocols) {
    return null;
  }

  const value = Array.isArray(protocols) ? protocols[0] : protocols;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean) || null;
};

const wss = new WebSocketServer({
  server,
  handleProtocols(protocols) {
    const [first] = Array.from(protocols);
    return first || false;
  },
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const authToken = extractWebSocketToken(req);
  const sid = url.searchParams.get("sessionId");
  const dockerId = url.searchParams.get("dockerId");
  const tmuxSessionName = url.searchParams.get("tmuxSessionName");
  const cols = url.searchParams.get("cols");
  const rows = url.searchParams.get("rows");

  if (!authToken) return ws.close();
  const authSession = getAuthSession(authToken);
  if (!authSession) return ws.close();

  if (!sid || !sessions.has(sid)) return ws.close();
  const session = sessions.get(sid)!;
  if (session.ownerId !== authSession.id) return ws.close();

  if (dockerId) {
    try {
      assertDockerIdentifier(dockerId);
    } catch {
      return ws.close();
    }

    // ------------------ Docker logs stream ------------------
    session.client.exec(
      `docker logs -f --tail 50 ${dockerId}`,
      (err: Error | undefined, stream: any) => {
        if (err) return ws.close();

        stream.on("data", (d: Buffer) => ws.send(d.toString()));
        stream.stderr.on("data", (d: Buffer) => ws.send(d.toString()));

        ws.on("close", () => stream.end());
      }
    );
  } else if (tmuxSessionName) {
    try {
      assertTmuxSessionName(tmuxSessionName);
    } catch {
      return ws.close();
    }

    // ------------------ Tmux attach stream ------------------

    const execOptions: any = {
      pty: true,
      term: "xterm-256color",
    };

    // Add window size if provided
    if (cols && rows) {
      execOptions.cols = parseInt(cols);
      execOptions.rows = parseInt(rows);
    }

    session.client.exec(
      `tmux attach -t ${tmuxSessionName}`,
      execOptions,
      (err: Error | undefined, stream: any) => {
        if (err) {
          ws.send(`\x1b[31mError attaching to tmux session: ${err.message}\x1b[0m\r\n`);
          return ws.close();
        }

        ws.on("message", (data: RawData) => {
          // Handle resize messages from frontend
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'resize' && msg.cols && msg.rows) {
              stream.setWindow(msg.rows, msg.cols);
              return;
            }
          } catch (e) {
            // Not JSON, treat as regular input
          }
          stream.write(data as Buffer);
        });

        stream.on("data", (d: Buffer) => ws.send(d.toString()));
        stream.on("close", () => ws.close());
        ws.on("close", () => stream.end());
      }
    );
  } else {
    // ------------------ Terminal shell ------------------

    const shellOptions: any = {
      term: "xterm-256color",  // Upgraded from xterm-color
    };

    if (cols && rows) {
      shellOptions.cols = parseInt(cols);
      shellOptions.rows = parseInt(rows);
    }

    session.client.shell(shellOptions, (err: Error | undefined, stream: any) => {
      if (err) return ws.close();

      ws.on("message", (data: RawData) => {
        // Handle resize messages
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'resize' && msg.cols && msg.rows) {
            stream.setWindow(msg.rows, msg.cols);
            return;
          }
        } catch (e) {
          // Not JSON, regular input
        }
        stream.write(data as Buffer);
      });

      stream.on("data", (d: Buffer) => ws.send(d.toString()));
      stream.on("close", () => ws.close());
      ws.on("close", () => stream.end());
    });
  }
});



console.log(`Server running on port ${port}`);
