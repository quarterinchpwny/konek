import { Client as SSHClient, ConnectConfig } from "ssh2";
import { db } from "../db";
import { serverHosts } from "../db/schema";
import { eq } from "drizzle-orm";

interface PooledConnection {
  client: SSHClient;
  lastUsed: number;
  inUse: boolean;
  config: ConnectConfig; // Store config to allow reconnection if needed
}

export class SSHConnectionPool {
  private connections = new Map<number, PooledConnection[]>();

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60000);
  }

  async getConnection(
    hostId: number,
    config: ConnectConfig
  ): Promise<SSHClient> {
    const pool = this.connections.get(hostId) ?? [];

    // Try to find an idle connection with the same config
    const idle = pool.find((c) => !c.inUse && this.isSameConfig(c.config, config));
    if (idle) {
      idle.inUse = true;
      idle.lastUsed = Date.now();
      return idle.client;
    }

    return new Promise((resolve, reject) => {
      const client = new SSHClient();
      const timeout = setTimeout(
        () => {
          client.end(); // Ensure client is ended on timeout
          reject(new Error("SSH connection timeout"));
        },
        20_000
      );

      client.on("ready", () => {
        clearTimeout(timeout);
        const newConnection = { client, inUse: true, lastUsed: Date.now(), config };
        pool.push(newConnection);
        this.connections.set(hostId, pool);
        resolve(client);
      });

      client.on("error", (err) => {
        clearTimeout(timeout);
        this.remove(hostId, client); // Remove on error
        reject(err);
      });
      client.on("close", () => this.remove(hostId, client));

      client.connect(config);
    });
  }

  release(hostId: number, client: SSHClient) {
    const pool = this.connections.get(hostId);
    const c = pool?.find((p) => p.client === client);
    if (c) {
      c.inUse = false;
      c.lastUsed = Date.now();
    }
  }

  private remove(hostId: number, client: SSHClient) {
    const pool = this.connections.get(hostId) ?? [];
    this.connections.set(
      hostId,
      pool.filter((p) => p.client !== client)
    );
    try {
      client.end();
    } catch { }
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, pool] of this.connections) {
      this.connections.set(
        id,
        pool.filter((c) => c.inUse || now - c.lastUsed < 10 * 60000)
      );
    }
  }

  private isSameConfig(config1: ConnectConfig, config2: ConnectConfig): boolean {

    return (
      config1.host === config2.host &&
      config1.port === config2.port &&
      config1.username === config2.username &&
      config1.password === config2.password &&
      config1.privateKey === config2.privateKey
    );
  }
}

export const sshPool = new SSHConnectionPool();

export async function getSSHService(hostId: string): Promise<SSHClient> {
  const numericHostId = Number(hostId);
  if (isNaN(numericHostId)) {
    throw new Error("Invalid host ID provided.");
  }

  const hostData = await db
    .select()
    .from(serverHosts)
    .where(eq(serverHosts.id, numericHostId))
    .get();

  if (!hostData) {
    throw new Error(`Host with ID ${hostId} not found.`);
  }
  if (!hostData.sshEnabled) {
    throw new Error(`SSH is not enabled for host ${hostId}.`);
  }

  const config: ConnectConfig = {
    host: hostData.hostname,
    port: hostData.port || 22,
    username: hostData.username,
    password: hostData.password || undefined, // Use password if available

    readyTimeout: 20000, // 20 seconds
  };

  if (!config.password && !config.privateKey) {
    throw new Error("SSH credentials (password or private key) are missing for this host.");
  }

  return sshPool.getConnection(numericHostId, config);
}
