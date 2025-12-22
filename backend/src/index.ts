import { serve } from "@hono/node-server";
import { db } from "./db";
import { serverHosts } from "./db/schema";
import { sql, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client as SSHClient, ConnectConfig } from "ssh2";
import { v4 as uuidv4 } from "uuid";
import { WebSocketServer, WebSocket } from "ws";

// --- Types ---

interface SSHSession {
  client: SSHClient;
  isConnected: boolean;
  lastActive: number;
  host: string;
}

interface CommandHistoryItem {
  userId: string;
  hostId: string;
  command: string;
  executedAt: number;
}

// Data needed to connect to a host for monitoring
interface MonitoredHostConfig {
  id: number;
  hostIp: string;
  username: string;
  password?: string;
}

interface ServerMetrics {
  cpu: number; // Percentage
  memory: { total: number; used: number; free: number; percent: number };
  disk: Array<{
    mount: string;
    used: string;
    available: string;
    percent: string;
  }>;
  uptime: string;
  timestamp: number;
}

// --- State (In-Memory) ---

const sessions = new Map<string, SSHSession>();

// MOCK DB: History
const historyStore: CommandHistoryItem[] = [];

// MOCK DB: Monitored Hosts
// In production,'sshData' and 'sshCredentials' tables
const monitoredHosts = new Map<number, MonitoredHostConfig>();

const metricsCache = new Map<number, ServerMetrics>();

// --- Helper: Simple SSH Command Execution (Promisified) ---
const execCommand = (client: SSHClient, cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = "";
      stream.on("data", (data: Buffer) => (output += data.toString()));
      stream.on("close", () => resolve(output.trim()));
      stream.on("error", (e: Error) => reject(e));
    });
  });
};

// --- Helper: Metrics Collectors (Inlined Logic) ---

async function collectSystemMetrics(client: SSHClient): Promise<ServerMetrics> {
  // 1. CPU Usage (Simplified: reads /proc/stat twice with delay)
  // Logic adapted from server-stats.ts
  const getCpu = async () => {
    const raw = await execCommand(client, "cat /proc/stat | grep 'cpu '");
    return raw.split(/\s+/).slice(1).map(Number);
  };

  const start = await getCpu();
  await new Promise((r) => setTimeout(r, 1000)); // Wait 1s
  const end = await getCpu();

  const idleDiff = end[3] - start[3];
  const totalStart = start.reduce((a, b) => a + b, 0);
  const totalEnd = end.reduce((a, b) => a + b, 0);
  const totalDiff = totalEnd - totalStart;
  const cpuPercent = 100 * (1 - idleDiff / totalDiff);

  // 2. Memory (using 'free -b')
  const memRaw = await execCommand(client, "free -b | grep Mem:");
  const memParts = memRaw.split(/\s+/);
  const totalMem = parseInt(memParts[1], 10);
  const usedMem = parseInt(memParts[2], 10);

  // 3. Disk (using 'df -h')
  const diskRaw = await execCommand(
    client,
    "df -h --output=source,size,used,avail,pcent,target | grep '^/'"
  );
  const disks = diskRaw.split("\n").map((line) => {
    const parts = line.split(/\s+/);
    return {
      mount: parts[5],
      used: parts[2],
      available: parts[3],
      percent: parts[4],
    };
  });

  // 4. Uptime
  const uptime = await execCommand(client, "uptime -p");

  return {
    cpu: parseFloat(cpuPercent.toFixed(1)),
    memory: {
      total: totalMem,
      used: usedMem,
      free: totalMem - usedMem,
      percent: parseFloat(((usedMem / totalMem) * 100).toFixed(1)),
    },
    disk: disks,
    uptime: uptime.replace("up ", ""),
    timestamp: Date.now(),
  };
}

// --- Service: Polling Manager ---
// Logic adapted from PollingManager in server-stats.ts
class PollingService {
  private intervals = new Map<number, NodeJS.Timeout>();

  async startMonitoring(hostId: number) {
    if (this.intervals.has(hostId)) return;

      const [config] = await db
    .select()
    .from(serverHosts)
    .where(sql`id = ${hostId}`);


    if (!config) {
        console.error(`Host with ID ${hostId} not found in database.`);
        return;
    }

    // Initial fetch
    this.poll(config);

    // Schedule polling (every 10s)
    const interval = setInterval(() => this.poll(config), 10000);
    this.intervals.set(hostId, interval);
    console.log(`Started monitoring host: ${hostId}`);
  }

  stopMonitoring(id: number) {
    const interval = this.intervals.get(id);
    if (interval) clearInterval(interval);
    this.intervals.delete(id);
    metricsCache.delete(id);
  }

  private async poll(config: typeof serverHosts.$inferSelect) {
    const client = new SSHClient();

    // Config adapted from buildSshConfig
    const sshConfig: ConnectConfig = {
      host: config.hostIp,
      port: 22, // Assuming default SSH port
      username: config.username,
      readyTimeout: 10000,
      password: config.password, // Directly using password from DB (unencrypted for now)
    };

    return new Promise<void>((resolve) => {
      client.on("ready", async () => {
        try {
          const metrics = await collectSystemMetrics(client);
          metricsCache.set(config.id, metrics);
        } catch (err) {
          console.error(`Error collecting metrics for ${config.id}:`, err);
        } finally {
          client.end();
          resolve();
        }
      });

      client.on("error", (err) => {
        console.error(`Connection error for ${config.id}:`, err.message);
        resolve(); // Resolve anyway to keep timer going
      });

      client.connect(sshConfig);
    });
  }
}

const pollingService = new PollingService();

const app = new Hono();

// --- Middleware ---

app.use(
  "/*",
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    credentials: true,
  })
);

// --- Existing Routes (Terminal & Files) ---

app.post("/api/connect", async (c) => {
  const body = await c.req.json();
  const { host, port, username, password, privateKey } = body;

  return new Promise((resolve) => {
    const client = new SSHClient();
    const sessionId = uuidv4();

    client.on("ready", () => {
      sessions.set(sessionId, {
        client,
        isConnected: true,
        lastActive: Date.now(),
        host,
      });

      resolve(
        c.json({
          status: "success",
          sessionId,
          message: "Connected successfully",
        })
      );
    });

    client.on("error", (err) => {
      resolve(c.json({ status: "error", message: err.message }, 500));
    });

    const config: any = {
      host,
      port: port || 22,
      username,
      readyTimeout: 20000,
    };

    if (privateKey) config.privateKey = privateKey;
    else if (password) config.password = password;

    try {
      client.connect(config);
    } catch (err: any) {
      resolve(c.json({ status: "error", message: err.message }, 500));
    }
  });
});

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

app.post("/api/disconnect", async (c) => {
  const { sessionId } = await c.req.json();
  const session = sessions.get(sessionId);
  if (session) {
    session.client.end();
    sessions.delete(sessionId);
  }
  return c.json({ status: "disconnected" });
});

// --- History Routes (Existing) ---

app.post("/api/terminal/history", async (c) => {
  const { hostId, command } = await c.req.json();
  const entry = {
    userId: "demo-user",
    hostId: String(hostId),
    command: command.trim(),
    executedAt: Date.now(),
  };
  historyStore.push(entry);
  return c.json(entry, 201);
});

app.get("/api/terminal/history/:hostId", async (c) => {
  const hostId = c.req.param("hostId");
  const userHistory = historyStore
    .filter((h) => h.hostId === hostId)
    .sort((a, b) => b.executedAt - a.executedAt);

  const uniqueCommands = Array.from(new Set(userHistory.map((h) => h.command)));
  return c.json(uniqueCommands.slice(0, 500));
});

// --- Drizzle DB Routes for Server Hosts ---

app.post("/api/hosts", async (c) => {
  try {
    const { alias, hostname, port, username, password } = await c.req.json();

    if (!alias || !hostname || !username) {
      return c.json({ error: "Missing required fields: alias, hostname, username" }, 400);
    }

    const newHost = await db.insert(serverHosts).values({
      alias,
      hostname,
      port: port || 22,
      username,
      password,
    }).returning();
    return c.json(newHost[0], 201);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: `Host with hostname ${c.req.json.hostname} already exists.` }, 409);
    }
    console.error("Error saving host:", error);
    return c.json({ error: "Failed to save host information" }, 500);
  }
});

app.get("/api/hosts", async (c) => {
  try {
    const hosts = await db.select().from(serverHosts);
    return c.json(hosts);
  } catch (error) {
    console.error("Error fetching hosts:", error);
    return c.json({ error: "Failed to fetch host information" }, 500);
  }
});

app.put("/api/hosts/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const updatedHostData = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "Invalid host ID" }, 400);
    }

    const [updatedHost] = await db.update(serverHosts)
      .set(updatedHostData)
      .where(eq(serverHosts.id, id))
      .returning();

    if (!updatedHost) {
      return c.json({ error: "Host not found" }, 404);
    }

    return c.json(updatedHost);
  } catch (error) {
    console.error("Error updating host:", error);
    return c.json({ error: "Failed to update host information" }, 500);
  }
});

app.delete("/api/hosts/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "Invalid host ID" }, 400);
    }

    const result = await db.delete(serverHosts).where(eq(serverHosts.id, id)).returning({ id: serverHosts.id });

    if (result.length === 0) {
      return c.json({ error: "Host not found" }, 404);
    }

    return c.json({ message: `Host with ID ${id} deleted successfully` });
  } catch (error) {
    console.error("Error deleting host:", error);
    return c.json({ error: "Failed to delete host information" }, 500);
  }
});


// --- NEW Routes: Server Stats (Based on server-stats.ts) ---

/**
 * Register a host for background monitoring.
 */
app.post("/api/stats/register", async (c) => {
  const body = await c.req.json();
  const { id } = body; // Expecting host ID from DB

  if (!id) {
    return c.json({ error: "Missing host ID" }, 400);
  }

  // Start the background poller
  // The polling service will fetch the full config from the DB
  pollingService.startMonitoring(id);

  return c.json({ message: "Monitoring started", hostId: id });
});

/**
 * Stop monitoring a host
 */
app.post("/api/stats/stop", async (c) => {
  const { id } = await c.req.json();
  if (!id) {
    return c.json({ error: "Missing host ID" }, 400);
  }
  pollingService.stopMonitoring(id);
  return c.json({ message: "Monitoring stopped" });
});

/**
 * Get latest metrics for a specific host
 */
app.get("/api/stats/:id", (c) => {
  const id = c.req.param("id");
  const metrics = metricsCache.get(Number(id));

  if (!metrics) {
    // Return empty/null structure if not ready yet
    // Matches structure in server-stats.ts
    return c.json(
      {
        error: "Metrics not available or gathering",
        cpu: null,
        memory: null,
        disk: [],
        uptime: null,
      },
      404
    );
  }

  return c.json(metrics);
});

// --- Server Startup ---

const port = 3000;
console.log(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

// --- WebSocket for Terminal ---

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId || !sessions.has(sessionId)) {
    ws.close();
    return;
  }

  const session = sessions.get(sessionId)!;
  const rows = Number(url.searchParams.get("rows")) || 24;
  const cols = Number(url.searchParams.get("cols")) || 80;

  session.client.shell({ term: "xterm-color", rows, cols }, (err, stream) => {
    if (err) {
      ws.close();
      return;
    }
    ws.on("message", (data) => stream.write(data as Buffer));
    stream.on("data", (data: Buffer) => ws.send(data));
    stream.on("close", () => ws.close());
    ws.on("close", () => stream.end());
  });
});
