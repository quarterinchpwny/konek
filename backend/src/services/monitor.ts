import { db } from "../db";
import { serverHosts } from "../db/schema";
import { eq } from "drizzle-orm";
import { SSHConnectionPool } from "../lib/ssh-pool";
import { tcpPing, AuthFailureTracker } from "../lib/network";
import { collectExtendedMetrics } from "./metrics";
import { HostStatus, ServerMetrics } from "../types";

export const metricsStore = new Map<number, ServerMetrics>();
export const statusStore = new Map<number, HostStatus>();

const pool = new SSHConnectionPool();
const authTracker = new AuthFailureTracker();

export class PollingService {
  private timers = new Map<number, NodeJS.Timeout>();

  start(id: number) {
    if (this.timers.has(id)) return;
    this.poll(id);
    this.timers.set(
      id,
      setInterval(() => this.poll(id), 10_000)
    );
  }

  stop(id: number) {
    const t = this.timers.get(id);
    if (t) clearInterval(t);
    this.timers.delete(id);
  }

  private async poll(id: number) {
    const [host] = await db
      .select()
      .from(serverHosts)
      .where(eq(serverHosts.id, id));

    if (!host) return this.stop(id);

    if (authTracker.shouldSkip(id)) {
      statusStore.set(id, {
        id,
        status: "auth_failed",
        lastChecked: Date.now(),
      });
      return;
    }

    if (!(await tcpPing(host.hostname, host.port || 22))) {
      statusStore.set(id, {
        id,
        status: "offline",
        lastChecked: Date.now(),
      });
      return;
    }

    let client;
    try {
      client = await pool.getConnection(id, {
        host: host.hostname,
        port: host.port || 22,
        username: host.username,
        password: host.password || undefined,
      });

      metricsStore.set(id, await collectExtendedMetrics(client));
      statusStore.set(id, {
        id,
        status: "online",
        lastChecked: Date.now(),
      });

      authTracker.reset(id);
    } catch (e: any) {
      if (e.level === "client-authentication") authTracker.recordFailure(id);
    } finally {
      if (client) pool.release(id, client);
    }
  }
}

export const pollingService = new PollingService();
