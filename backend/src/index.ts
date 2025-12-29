import "dotenv/config";
import { serve } from "@hono/node-server";
import { db } from "./db";
import { serverHosts } from "./db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client as SSHClient, ConnectConfig, ClientChannel } from "ssh2";
import { v4 as uuidv4 } from "uuid";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";

// --- Types & Interfaces ---

interface SSHSession {
  client: SSHClient;
  isConnected: boolean;
  lastActive: number;
  host: string;
}

// Complete Metrics Structure (Matching server-stats.ts)
interface ServerMetrics {
  cpu: {
    percent: number;
    cores: number;
    load: [number, number, number]; // 1m, 5m, 15m
  };
  memory: {
    percent: number;
    total: number;
    used: number;
    free: number;
  };
  disk: Array<{
    mount: string;
    used: string;
    available: string;
    percent: string;
  }>;
  network: Array<{
    name: string;
    ip: string;
    rx: string;
    tx: string;
  }>;
  processes: {
    total: number;
    running: number;
    top: Array<{
      pid: string;
      user: string;
      cpu: string;
      mem: string;
      command: string;
    }>;
  };
  system: {
    hostname: string;
    os: string;
    uptime: string;
  };
  timestamp: number;
  docker: Record<string,any> | null,
}

interface HostStatus {
  id: number;
  status: "online" | "offline" | "auth_failed";
  lastChecked: number;
}

// --- UTILITIES: Resilience & networking ---

// 1. TCP Ping (Check online status without SSH)
function tcpPing(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const onDone = (result: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => onDone(true));
    socket.once("timeout", () => onDone(false));
    socket.once("error", () => onDone(false));
    try {
      socket.connect(port, host);
    } catch {
      onDone(false);
    }
  });
}

// 2. Auth Failure Tracker (Circuit Breaker)
class AuthFailureTracker {
  private failures = new Map<number, { count: number; lastFail: number }>();

  recordFailure(hostId: number) {
    const current = this.failures.get(hostId) || { count: 0, lastFail: 0 };
    this.failures.set(hostId, {
      count: current.count + 1,
      lastFail: Date.now(),
    });
  }

  shouldSkip(hostId: number): boolean {
    const record = this.failures.get(hostId);
    if (!record) return false;
    // Backoff logic: if >3 failures, wait 5 minutes
    if (record.count >= 3 && Date.now() - record.lastFail < 5 * 60 * 1000) {
      return true;
    }
    // Reset if timeout passed
    if (Date.now() - record.lastFail > 5 * 60 * 1000) {
      this.failures.delete(hostId);
      return false;
    }
    return false;
  }

  reset(hostId: number) {
    this.failures.delete(hostId);
  }
}

const authTracker = new AuthFailureTracker();

// --- CORE: SSH Connection Pool ---

interface PooledConnection {
  client: SSHClient;
  lastUsed: number;
  inUse: boolean;
}

class SSHConnectionPool {
  private connections = new Map<number, PooledConnection[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup idle connections every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async getConnection(
    hostId: number,
    config: ConnectConfig
  ): Promise<SSHClient> {
    const pool = this.connections.get(hostId) || [];

    // 1. Try to find an idle connection
    const idle = pool.find((c) => !c.inUse);
    if (idle) {
      // Validate connection is still alive
      try {
        // Simple check if stream is writable
        // Note: ideal check is client.sftp or a keepalive, but simple works for now
        idle.inUse = true;
        idle.lastUsed = Date.now();
        return idle.client;
      } catch {
        // If dead, remove and continue
        this.removeConnection(hostId, idle.client);
      }
    }

    // 2. Create new connection
    return new Promise((resolve, reject) => {
      const client = new SSHClient();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error("Connection timeout"));
      }, 20000);

      client.on("ready", () => {
        clearTimeout(timeout);
        // Add to pool
        const newPool = this.connections.get(hostId) || [];
        newPool.push({ client, lastUsed: Date.now(), inUse: true });
        this.connections.set(hostId, newPool);
        resolve(client);
      });

      client.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.on("end", () => this.removeConnection(hostId, client));
      client.on("close", () => this.removeConnection(hostId, client));

      try {
        client.connect(config);
      } catch (err) {
        reject(err);
      }
    });
  }

  releaseConnection(hostId: number, client: SSHClient) {
    const pool = this.connections.get(hostId);
    if (pool) {
      const conn = pool.find((c) => c.client === client);
      if (conn) {
        conn.inUse = false;
        conn.lastUsed = Date.now();
      }
    }
  }

  private removeConnection(hostId: number, client: SSHClient) {
    let pool = this.connections.get(hostId);
    if (pool) {
      pool = pool.filter((c) => c.client !== client);
      this.connections.set(hostId, pool);
      try {
        client.end();
      } catch {}
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [hostId, pool] of this.connections.entries()) {
      // Close connections idle for > 10 mins
      pool.forEach((conn) => {
        if (!conn.inUse && now - conn.lastUsed > 10 * 60 * 1000) {
          conn.client.end();
        }
      });
      const activePool = pool.filter(
        (conn) => conn.inUse || now - conn.lastUsed <= 10 * 60 * 1000
      );
      this.connections.set(hostId, activePool);
    }
  }
}

const connectionPool = new SSHConnectionPool();

// --- DATA COLLECTORS (Expanded) ---

const exec = (client: SSHClient, cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = "";
      stream.on("data", (d: Buffer) => (output += d.toString()));
      stream.stderr.on("data", () => {}); // Ignore stderr for now
      stream.on("close", () => resolve(output.trim()));
    });
  });
};

async function collectExtendedMetrics(
  client: SSHClient
): Promise<ServerMetrics> {
  // ---------- BASE METRICS (always available) ----------
  const [cpuInfo, memRaw, diskRaw, netRaw, procRaw, osRaw, uptimeRaw] =
    await Promise.all([
      exec(
        client,
        "cat /proc/loadavg && grep -c processor /proc/cpuinfo && cat /proc/stat | grep 'cpu '"
      ),
      exec(client, "free -b"),
      exec(
        client,
        "df -h --output=source,size,used,avail,pcent,target | grep '^/'"
      ),
      exec(client, "cat /proc/net/dev"),
      exec(
        client,
        "ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 6 && ps -e | wc -l"
      ),
      exec(
        client,
        "hostname && uname -r && cat /etc/os-release | grep PRETTY_NAME"
      ),
      exec(client, "uptime -p"),
    ]);

  // ---------- CPU ----------
  const cpuLines = cpuInfo.split("\n");
  const load = cpuLines[0].split(" ").slice(0, 3).map(Number) as [
    number,
    number,
    number
  ];
  const cores = parseInt(cpuLines[1]) || 1;
  const cpuPercent = Math.min(100, (load[0] / cores) * 100);

  // ---------- MEMORY ----------
  const memLine = memRaw.split("\n").find((l) => l.startsWith("Mem:")) || "";
  const memData = memLine.split(/\s+/);
  const totalMem = parseInt(memData[1] || "0");
  const usedMem = parseInt(memData[2] || "0");
  const freeMem = parseInt(memData[3] || "0");

  // ---------- DISK ----------
  const disks = diskRaw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const p = line.split(/\s+/);
      return { mount: p[5], used: p[2], available: p[3], percent: p[4] };
    });

  // ---------- NETWORK ----------
  const network = netRaw
    .split("\n")
    .slice(2)
    .map((line) => {
      const p = line.trim().split(/\s+/);
      return {
        name: p[0].replace(":", ""),
        rx: Number(p[1]),
        tx: Number(p[9]),
      };
    });

  // ---------- PROCESSES ----------
  const procLines = procRaw.split("\n");
  const totalProcs = parseInt(procLines[procLines.length - 1]) || 0;
  const topProcs = procLines.slice(1, 6).map((line) => {
    const p = line.trim().split(/\s+/);
    return {
      pid: p[0],
      user: p[1],
      cpu: Number(p[2]),
      mem: Number(p[3]),
      command: p[4],
    };
  });

  // ---------- SYSTEM ----------
  const osLines = osRaw.split("\n");
  const hostname = osLines[0];
  const osName =
    osLines
      .find((l) => l.startsWith("PRETTY_NAME"))
      ?.split("=")[1]
      ?.replace(/"/g, "") || "Linux";

  // ---------- DOCKER (OPTIONAL) ----------
  let docker: ServerMetrics["docker"] | null = null;

  try {
    // Check docker exists
    await exec(client, "command -v docker");

    // Check daemon access
    await exec(client, "docker ps --no-trunc >/dev/null");

    const [psRaw, statsRaw] = await Promise.all([
      exec(client, "docker ps --format '{{json .}}'"),
      exec(client, "docker stats --no-stream --format '{{json .}}'"),
    ]);

    const containers = psRaw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    const parseBytes = (s: string) => {
      const m = s.match(/([\d.]+)\s*(KiB|MiB|GiB)/);
      if (!m) return 0;
      const v = parseFloat(m[1]);
      return m[2] === "KiB"
        ? v * 1024
        : m[2] === "MiB"
        ? v * 1024 ** 2
        : v * 1024 ** 3;
    };

    const statsMap = Object.fromEntries(
      statsRaw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          const s = JSON.parse(l);
          const [used, limit] = s.MemUsage.split(" / ");
          return [
            s.Name,
            {
              cpu: parseFloat(s.CPUPerc.replace("%", "")) || 0,
              memUsed: parseBytes(used),
              memLimit: parseBytes(limit),
              memPercent: parseFloat(s.MemPerc.replace("%", "")) || 0,
            },
          ];
        })
    );

    docker = {
      containers: containers.map((c) => ({
        name: c.Names,
        image: c.Image,
        status: c.Status,
        stats: statsMap[c.Names] || null,
      })),
    };
  } catch {
    // Docker not installed or not accessible → ignore silently
  }

  // ---------- FINAL RESULT ----------
  return {
    cpu: { percent: Number(cpuPercent.toFixed(1)), cores, load },
    memory: {
      percent: totalMem ? (usedMem / totalMem) * 100 : 0,
      total: totalMem,
      used: usedMem,
      free: freeMem,
    },
    disk: disks,
    network,
    processes: { total: totalProcs, running: 0, top: topProcs },
    system: {
      hostname,
      os: osName,
      uptime: uptimeRaw.replace("up ", ""),
    },
    docker,
    timestamp: Date.now(),
  };
}

// --- POLLING MANAGER ---

const metricsStore = new Map<number, ServerMetrics>();
const statusStore = new Map<number, HostStatus>();

class PollingService {
  private timers = new Map<number, NodeJS.Timeout>();

  async start(hostId: number) {
    // Prevent duplicate timers
    if (this.timers.has(hostId)) return;

    // 1. Run the first poll immediately (async, don't await so the API stays fast)
    this.poll(hostId);

    // 2. Schedule future polls
    const t = setInterval(() => this.poll(hostId), 10000);
    this.timers.set(hostId, t);
  }

  stop(hostId: number) {
    const t = this.timers.get(hostId);
    if (t) clearInterval(t);
    this.timers.delete(hostId);
    // connectionPool.releaseConnection(hostId, ...); // Handled by cleanup
  }

  private async poll(hostId: number) {
    // 1. Fetch Config
    const [config] = await db
      .select()
      .from(serverHosts)
      .where(eq(serverHosts.id, hostId));
    if (!config) {
      this.stop(hostId);
      return;
    }
    const now = Date.now(); // Capture the current time
    // 2. Check Circuit Breaker
    if (authTracker.shouldSkip(hostId)) {
      statusStore.set(hostId, {
        id: hostId,
        status: "auth_failed",
        lastChecked: Date.now(),
      });
      return;
    }

    // 3. Fast TCP Ping
    const isOnline = await tcpPing(config.hostname, config.port || 22);
    if (!isOnline) {
      statusStore.set(hostId, {
        id: hostId,
        status: "offline",
        lastChecked: Date.now(),
      });
      return;
    }

    statusStore.set(hostId, {
      id: hostId,
      status: "online",
      lastChecked: Date.now(),
    });

    // 4. SSH Metrics Collection (Using Pool)
    let client: SSHClient | null = null;
    try {
      client = await connectionPool.getConnection(hostId, {
        host: config.hostname,
        port: config.port || 22,
        username: config.username,
        password: config.password || undefined,
        readyTimeout: 10000,
      });

      const metrics = await collectExtendedMetrics(client);
      metricsStore.set(hostId, metrics);

      // Success? Reset failures
      authTracker.reset(hostId);
    } catch (err: any) {
      console.error(`Polling error host ${hostId}:`, err.message);
      if (err.level === "client-authentication") {
        authTracker.recordFailure(hostId);
        statusStore.set(hostId, {
          id: hostId,
          status: "auth_failed",
          lastChecked: Date.now(),
        });
      }
    } finally {
      if (client) connectionPool.releaseConnection(hostId, client);
    }
  }
}

const pollingService = new PollingService();

// --- API SERVER (Hono) ---

const app = new Hono();

// Middleware
app.use(
  "*",
  cors({
    origin: (origin) => origin, // Simplify for example
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// --- SESSION STATE (Terminal) ---
const sessions = new Map<string, SSHSession>();
const historyStore: any[] = [];

// 1. TERMINAL ROUTES
app.post("/api/connect", async (c) => {
  const { hostId } = await c.req.json();
  const [host] = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, hostId));
  if (!host) return c.json({ error: "Host not found" }, 404);

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
      resolve(c.json({ status: "success", sessionId }));
    });
    client.on("error", (e) =>
      resolve(c.json({ status: "error", message: e.message }, 500))
    );

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

app.post("/api/disconnect", async (c) => {
  const { sessionId } = await c.req.json();
  const s = sessions.get(sessionId);
  if (s) {
    s.client.end();
    sessions.delete(sessionId);
  }
  return c.json({ status: "disconnected" });
});
// 2. FILE MANAGEMENT

app.get("/api/files/list", async (c) => {
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
      if (err) return resolve(c.json({ error: err.message }, 500));

      let output = "";
      stream.on("data", (data: Buffer) => (output += data.toString()));
      stream.on("close", (code: number) => {
        if (code !== 0)
          return resolve(c.json({ error: "Command failed" }, 500));

        // Simple LS Parser
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

app.get("/api/files/read", async (c) => {
  const sessionId = c.req.query("sessionId");
  const filePath = c.req.query("path");

  if (!sessionId || !sessions.has(sessionId))
    return c.json({ error: "No Session" }, 401);

  const session = sessions.get(sessionId)!;

  return new Promise((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err) return resolve(c.json({ error: "SFTP not available" }, 500));
      const stream = sftp.createReadStream(filePath as string);
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () =>
        resolve(c.json({ content: Buffer.concat(chunks).toString("utf-8") }))
      );
      stream.on("error", (e) => resolve(c.json({ error: e.message }, 500)));
    });
  });
});

// 2. HOST MANAGEMENT
app.get("/api/hosts", async (c) => {
  // 1. LIMIT RETURNED COLUMNS (No passwords/keys)
  const hosts = await db.select().from(serverHosts);

  const result = hosts.map((h) => {
    const liveStatus = statusStore.get(h.id);

    // 2. AUTO-START POLLING
    // If we aren't tracking this host yet, trigger the service
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
      // 3. INCLUDE LAST CHECKED TIMESTAMP
      // Convert to ISO string or return null if never checked
      lastChecked: liveStatus?.lastChecked
        ? new Date(liveStatus.lastChecked).toISOString()
        : null,
    };
  });

  return c.json(result);
});

app.post("/api/hosts", async (c) => {
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
    if (error.message.includes("UNIQUE constraint failed")) {
      return c.json(
        { error: `Host with hostname ${c.req.json.hostname} already exists.` },
        409
      );
    }
    console.error("Error saving host:", error);
    return c.json({ error: "Failed to save host information" }, 500);
  }
});
// New endpoint for on-demand status checks
app.get("/api/check-online/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const hostData = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, id))
    .get();

  const isOnline = await tcpPing(hostData.hostname, hostData.port || 22);

  return c.json({
    // ...hostData,
    host: hostData.alias,
    online: isOnline,
    lastChecked: new Date().toISOString(),
  });
});
// 3. STATS / MONITORING
app.post("/api/stats/register", async (c) => {
  const { id } = await c.req.json();
  if (id) pollingService.start(id);
  return c.json({ message: "Started" });
});

app.get("/api/stats/:id", (c) => {
  const id = Number(c.req.param("id"));
  const metrics = metricsStore.get(id);
  const status = statusStore.get(id);

  if (!metrics)
    return c.json(
      { error: "No metrics yet", status: status?.status || "unknown" },
      404
    );
  return c.json({ ...metrics, status: status?.status });
});
app.post("/api/stats/stop", async (c) => {
  const { id } = await c.req.json();
  if (!id) {
    return c.json({ error: "Missing host ID" }, 400);
  }
  pollingService.stop(id);
  return c.json({ message: "Monitoring stopped" });
});
// --- SERVER STARTUP ---

const port = 3000;
console.log(`Server running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});

// WebSocket (Terminal)
const wss = new WebSocketServer({ server });
wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sid = url.searchParams.get("sessionId");
  if (!sid || !sessions.has(sid)) return ws.close();

  const session = sessions.get(sid)!;
  session.client.shell({ term: "xterm-color" }, (err, stream) => {
    if (err) return ws.close();
    ws.on("message", (d) => stream.write(d as Buffer));
    stream.on("data", (d) => ws.send(d));
    stream.on("close", () => ws.close());
    ws.on("close", () => stream.end());
  });
});
