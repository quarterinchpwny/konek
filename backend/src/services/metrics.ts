import { Client as SSHClient } from "ssh2";
import { exec } from "../lib/ssh-utils";
import { ServerMetrics } from "../../types";

// ---------- MODULE-LEVEL (required for top/htop semantics) ----------
let prevCpuStat: { idle: number; total: number } | null = null;

export async function collectExtendedMetrics(
  client: SSHClient
): Promise<ServerMetrics> {
  // ---------- BASE METRICS (always available) ----------
  const [cpuInfo, memRaw, diskRaw, netRaw, procRaw, osRaw, uptimeRaw] =
    await Promise.all([
      exec(
        client,
        "cat /proc/loadavg && grep -c processor /proc/cpuinfo && cat /proc/stat | grep '^cpu '"
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
  const cpuLines = cpuInfo.trim().split("\n");

  // load averages (uptime semantics)
  const load = cpuLines[0]
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(Number) as [number, number, number];

  const cores = Math.max(1, parseInt(cpuLines[1], 10));

  // ---- REAL CPU USAGE (top / htop semantics) ----
  const stat = cpuLines[2].trim().split(/\s+/).map(Number);

  const user = stat[1];
  const nice = stat[2];
  const system = stat[3];
  const idle = stat[4];
  const iowait = stat[5];
  const irq = stat[6];
  const softirq = stat[7];
  const steal = stat[8];

  const idleTime = idle + iowait;
  const totalTime =
    user + nice + system + idle + iowait + irq + softirq + steal;

  let cpuUsagePercent = 0;

  if (prevCpuStat) {
    const idleDelta = idleTime - prevCpuStat.idle;
    const totalDelta = totalTime - prevCpuStat.total;

    if (totalDelta > 0) {
      cpuUsagePercent = Number(
        ((1 - idleDelta / totalDelta) * 100).toFixed(1)
      );
    }
  }

  prevCpuStat = { idle: idleTime, total: totalTime };

  // ---- LOAD PRESSURE (not CPU usage) ----
  const normalizedLoadPercent = Number(
    ((load[0] / cores) * 100).toFixed(1)
  );

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
      return {
        mount: p[5],
        used: p[2],
        available: p[3],
        percent: p[4],
        total: p[1],
      };
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
    await exec(client, "command -v docker");
    await exec(client, "docker ps -a --no-trunc >/dev/null");

    const [psRaw, statsRaw] = await Promise.all([
      exec(client, "docker ps -a --format '{{json .}}'"),
      exec(client, "docker stats --no-stream --format '{{json .}}'").catch(() => ""),
    ]);

    const containers = psRaw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    // ---------- stats ----------
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

    // ---------- inspect (ONE CALL) ----------
    const inspectRaw = await exec(
      client,
      `docker inspect ${containers.map((c) => c.ID).join(" ")}`
    );
    const inspect = JSON.parse(inspectRaw);

    const inspectMap = Object.fromEntries(
      inspect.map((i: any) => [i.Name.replace("/", ""), i])
    );

    const parsePorts = (ports: string) =>
      ports
        ? ports.split(",").map((p) => {
          const m = p.trim().match(/(?:(.+?):)?(\d+)->(\d+)\/(\w+)/);
          return m
            ? {
              hostIp: m[1] || null,
              hostPort: Number(m[2]),
              containerPort: Number(m[3]),
              protocol: m[4],
            }
            : null;
        }).filter(Boolean)
        : [];

    docker = {
      containers: containers.map((c) => {
        const i = inspectMap[c.Names] || {};
        const labels = i.Config?.Labels || {};

        return {
          id: c.ID,
          name: c.Names,
          image: c.Image,
          status: c.Status,

          ports: parsePorts(c.Ports),

          labels,
          group:
            labels.group ||
            labels["com.docker.compose.project"] ||
            null,

          health: i.State?.Health?.Status ?? "none",
          restartPolicy: i.HostConfig?.RestartPolicy?.Name ?? "none",

          stats: statsMap[c.Names] || null,
        };
      }),
    };
  } catch {
    // ignore
  }
  // ---------- FINAL RESULT ----------
  return {
    cpu: {
      usagePercent: cpuUsagePercent,
      normalizedLoadPercent,
      load,
      cores,
    },
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
    docker: docker,
    timestamp: Date.now(),
  };
}
