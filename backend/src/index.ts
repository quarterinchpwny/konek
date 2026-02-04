import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";

import { sessions } from "./services/session";
import hostsRoute from "./routes/hosts";
import filesRoute from "./routes/files";
import terminalRoute from "./routes/terminal";
import statsRoute from "./routes/stats";
import dockerRoute from "./routes/docker";
import activityRoute from "./routes/activity";
import networkRoute from "./routes/network";
import { Server as HttpServer } from "node:http";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
  })
);



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

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sid = url.searchParams.get("sessionId");
  const dockerId = url.searchParams.get("dockerId");
  const tmuxSessionName = url.searchParams.get("tmuxSessionName");
  const cols = url.searchParams.get("cols");
  const rows = url.searchParams.get("rows");

  if (!sid || !sessions.has(sid)) return ws.close();
  const session = sessions.get(sid)!;

  if (dockerId) {
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

        ws.on("message", (data) => {
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

        stream.on("data", (d: Buffer) => ws.send(d));
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

      ws.on("message", (data) => {
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

      stream.on("data", (d: Buffer) => ws.send(d));
      stream.on("close", () => ws.close());
      ws.on("close", () => stream.end());
    });
  }
});



console.log(`Server running on port ${port}`);