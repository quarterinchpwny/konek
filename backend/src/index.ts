import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";

import { sessions } from "./services/session";
import hostsRoute from "./routes/hosts";
import filesRoute from "./routes/files";
import terminalRoute from "./routes/terminal";
import statsRoute from "./routes/stats";
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
app.route("/api", terminalRoute);
app.route("/api/stats", statsRoute);

const port = 3000;

const server = serve({
  fetch: app.fetch,
  port,
  hostname:'0.0.0.0'
}) as HttpServer;

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sid = url.searchParams.get("sessionId");

  if (!sid || !sessions.has(sid)) return ws.close();

  const session = sessions.get(sid)!;

  session.client.shell(
    { term: "xterm-color" },
    (err: Error | undefined, stream: any) => {
      if (err) return ws.close();

      ws.on("message", (d) => stream.write(d as Buffer));
      stream.on("data", (d: Buffer) => ws.send(d));
      stream.on("close", () => ws.close());
      ws.on("close", () => stream.end());
    }
  );
});

console.log(`Server running on port ${port}`);
