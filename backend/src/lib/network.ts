import net from "net";

export function tcpPing(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

export class AuthFailureTracker {
  private failures = new Map<number, { count: number; lastFail: number }>();

  recordFailure(hostId: number) {
    const f = this.failures.get(hostId) ?? { count: 0, lastFail: 0 };
    this.failures.set(hostId, {
      count: f.count + 1,
      lastFail: Date.now(),
    });
  }

  shouldSkip(hostId: number) {
    const f = this.failures.get(hostId);
    if (!f) return false;

    if (f.count >= 3 && Date.now() - f.lastFail < 5 * 60_000) {
      return true;
    }

    if (Date.now() - f.lastFail > 5 * 60_000) {
      this.failures.delete(hostId);
    }

    return false;
  }

  reset(hostId: number) {
    this.failures.delete(hostId);
  }
}
