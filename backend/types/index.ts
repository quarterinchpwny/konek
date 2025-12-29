import { Client as SSHClient } from "ssh2";

export interface SSHSession {
  client: SSHClient;
  isConnected: boolean;
  lastActive: number;
  host: string;
}

export interface ServerMetrics {
  cpu: {
    percent: number;
    cores: number;
    load: [number, number, number];
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
    rx: number;
    tx: number;
  }>;
  processes: {
    total: number;
    running: number;
    top: Array<{
      pid: string;
      user: string;
      cpu: number;
      mem: number;
      command: string;
    }>;
  };
  system: {
    hostname: string;
    os: string;
    uptime: string;
  };
  docker: Record<string, any> | null;
  timestamp: number;
}

export interface HostStatus {
  id: number;
  status: "online" | "offline" | "auth_failed";
  lastChecked: number;
}
