import { Client as SSHClient, ConnectConfig } from "ssh2";

interface PooledConnection {
  client: SSHClient;
  lastUsed: number;
  inUse: boolean;
}

export class SSHConnectionPool {
  private connections = new Map<number, PooledConnection[]>();

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60_000);
  }

  async getConnection(
    hostId: number,
    config: ConnectConfig
  ): Promise<SSHClient> {
    const pool = this.connections.get(hostId) ?? [];

    const idle = pool.find((c) => !c.inUse);
    if (idle) {
      idle.inUse = true;
      idle.lastUsed = Date.now();
      return idle.client;
    }

    return new Promise((resolve, reject) => {
      const client = new SSHClient();
      const timeout = setTimeout(
        () => reject(new Error("SSH timeout")),
        20_000
      );

      client.on("ready", () => {
        clearTimeout(timeout);
        pool.push({ client, inUse: true, lastUsed: Date.now() });
        this.connections.set(hostId, pool);
        resolve(client);
      });

      client.on("error", reject);
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
    } catch {}
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, pool] of this.connections) {
      this.connections.set(
        id,
        pool.filter((c) => c.inUse || now - c.lastUsed < 10 * 60_000)
      );
    }
  }
}
