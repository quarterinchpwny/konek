<template>
  <section class="relative z-[2] p-4 md:p-3">
    <article class="mb-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <header class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white/95">System Stats</h3>
      </header>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 grid-cols-1">
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">CPU</span>
          <span class="text-base font-bold text-white/95">{{ formatPercent(cpuUsagePercent) }}</span>
          <p class="mt-1 text-xs text-white/55">load {{ formatFloat(cpuLoadAverage) }}</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">Memory</span>
          <span class="text-base font-bold text-white/95">{{ formatPercent(memoryPercent) }}</span>
          <p class="mt-1 text-xs text-white/55">
            {{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryTotal) }}
          </p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">Disk</span>
          <span class="text-base font-bold text-white/95">{{ primaryDisk?.percent || "N/A" }}</span>
          <p class="mt-1 truncate text-xs text-white/55">
            {{ primaryDisk?.mount || "/" }} · {{ primaryDisk?.used || "N/A" }} / {{ primaryDisk?.total || "N/A" }}
          </p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">Processes</span>
          <span class="text-base font-bold text-white/95">{{ processTotal ?? "N/A" }}</span>
          <p class="mt-1 text-xs text-white/55">total running entries</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">Hostname</span>
          <span class="truncate text-base font-bold text-white/95">{{ systemHostname || "N/A" }}</span>
          <p class="mt-1 text-xs text-white/55">remote system name</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <span class="mb-1 block text-xs text-white/55">Uptime</span>
          <span class="truncate text-base font-bold text-white/95">{{ systemUptime || "N/A" }}</span>
          <p class="mt-1 text-xs text-white/55">current host uptime</p>
        </div>
      </div>
      <div v-if="hostId == null || !sessionId" class="mt-3 rounded-lg border border-dashed border-white/20 bg-white/5 p-3 text-xs text-white/60">
        Connect to a host to populate live system stats.
      </div>
    </article>

    <div class="grid gap-4 xl:grid-cols-[2fr_2fr_1.35fr] lg:grid-cols-2 grid-cols-1">
      <article class="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/95">At a Glance</h3>
        </header>

        <div class="grid gap-3 sm:grid-cols-2 grid-cols-1">
          <div class="rounded-lg border border-white/10 bg-white/5 p-3">
            <span class="mb-1 block text-xs text-white/55">Host</span>
            <div class="flex items-center justify-between gap-2">
              <span class="text-base font-bold text-white/95">{{ selectedHost?.alias }}</span>
              <span class="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide" :class="statusClass">
                {{ serverStatus }}
              </span>
            </div>
            <p class="mt-1 truncate text-xs text-white/55">
              {{ selectedHost?.username }}@{{ selectedHost?.hostname }}:{{ selectedHost?.port || 22 }}
            </p>
          </div>

          <div class="rounded-lg border border-white/10 bg-white/5 p-3">
            <span class="mb-1 block text-xs text-white/55">Session</span>
            <span class="text-base font-bold text-white/95">{{ sessionId ? "Attached" : "Disconnected" }}</span>
            <p class="mt-1 text-xs text-white/55">
              SSH {{ selectedHost?.sshEnabled ? "enabled" : "disabled" }}
            </p>
          </div>

          <div class="rounded-lg border border-white/10 bg-white/5 p-3">
            <span class="mb-1 block text-xs text-white/55">Containers</span>
            <span class="text-base font-bold text-white/95">{{ runningContainers }}/{{ totalContainers }}</span>
            <p class="mt-1 text-xs text-white/55">
              {{ stoppedContainers }} stopped
            </p>
          </div>

          <div class="rounded-lg border border-white/10 bg-white/5 p-3">
            <span class="mb-1 block text-xs text-white/55">Services</span>
            <span class="text-base font-bold text-white/95">{{ serviceUpCount }}/{{ serviceCount }}</span>
            <p class="mt-1 text-xs text-white/55">
              {{ serviceDownCount }} not running
            </p>
          </div>
        </div>
      </article>

      <article class="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/95">Services</h3>
          <span class="text-xs text-white/55">{{ topServices.length }} shown</span>
        </header>

        <div v-if="topServices.length > 0" class="grid gap-2 sm:grid-cols-2 grid-cols-1">
          <div v-for="service in topServices" :key="service.id" class="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-xs font-semibold text-white/95">{{ service.name }}</span>
              <span class="h-2 w-2 rounded-full" :class="isRunning(service.status) ? 'bg-emerald-400' : 'bg-rose-400'" />
            </div>
            <p class="mt-1 truncate text-xs text-white/55">{{ service.image }}</p>
            <p class="mt-0.5 truncate text-xs text-white/55">{{ service.status }}</p>
            <p v-if="service.compose?.project || service.compose?.service" class="mt-0.5 truncate text-xs text-sky-200/80">
              {{ service.compose?.project || "standalone" }} / {{ service.compose?.service || "service" }}
            </p>
            <p class="mt-0.5 truncate text-xs text-white/50">
              health: {{ service.health || "none" }}
            </p>
          </div>
        </div>

        <div v-else class="rounded-lg border border-dashed border-white/20 bg-white/5 p-3 text-xs text-white/60">
          No service telemetry available for this host yet.
        </div>
      </article>

      <article class="rounded-xl border border-white/10 bg-slate-950/60 p-4 lg:col-span-2 xl:col-span-1">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/95">Operations</h3>
        </header>

        <QuickActions />

        <div class="mt-3 rounded-lg border border-white/10 bg-white/5 p-2">
          <RecentActivity :host-id="hostId ?? undefined" />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import QuickActions from "../QuickActions.vue";
import RecentActivity from "../RecentActivity.vue";
import { useOverviewData } from "../../composables/useOverviewData";

const props = defineProps<{
  hostId: number | null;
  sessionId: string | null;
  serverStatus: string;
}>();

const {
  cpuLoadAverage,
  cpuUsagePercent,
  isRunning,
  memoryPercent,
  memoryTotal,
  memoryUsed,
  primaryDisk,
  processTotal,
  runningContainers,
  selectedHost,
  serviceCount,
  serviceDownCount,
  serviceUpCount,
  statusClass,
  stoppedContainers,
  systemHostname,
  systemUptime,
  topServices,
  totalContainers,
} = useOverviewData(props);

const formatPercent = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

const formatFloat = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return "N/A";
  return value.toFixed(2);
};

const formatBytes = (value: number | null) => {
  if (value == null || value <= 0) return "N/A";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / Math.pow(1024, exponent);
  return `${scaled.toFixed(1)} ${units[exponent]}`;
};
</script>

<style scoped>
.status-online {
  color: #69c882;
  border-color: rgba(105, 200, 130, 0.35);
  background: rgba(105, 200, 130, 0.15);
}

.status-offline {
  color: #f77e7e;
  border-color: rgba(247, 126, 126, 0.35);
  background: rgba(247, 126, 126, 0.15);
}

.status-unknown {
  color: #9eb1c5;
  border-color: rgba(158, 177, 197, 0.35);
  background: rgba(158, 177, 197, 0.15);
}
</style>
