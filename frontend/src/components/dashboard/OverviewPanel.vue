<template>
  <section class="relative z-[2] p-4 md:p-3">
    <article class="overview-panel mb-4 rounded-xl p-4">
      <header class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white/90">System Stats</h3>
      </header>
      <div
        v-if="hostId != null && sessionId"
        class="stats-embed"
      >
        <ServerStats :host-id="hostId" compact :show-header="false" :show-docker="false" />
      </div>
      <div
        v-else
        class="mt-3 rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs text-white/40"
      >
        Connect to a host to populate live system stats.
      </div>
    </article>

    <div
      class="grid gap-4 xl:grid-cols-[2fr_2fr_1.35fr] lg:grid-cols-2 grid-cols-1"
    >
      <article class="overview-panel rounded-xl p-4">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/90">At a Glance</h3>
        </header>

        <div class="grid gap-3 sm:grid-cols-2 grid-cols-1">
          <div class="overview-card rounded-lg p-3">
            <span class="mb-1 block text-xs text-white/40">Host</span>
            <div class="flex items-center justify-between gap-2">
              <span class="text-base font-bold text-white/90">{{
                selectedHost?.alias
              }}</span>
              <span
                class="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide"
                :class="statusClass"
              >
                {{ serverStatus }}
              </span>
            </div>
            <p class="mt-1 truncate text-xs text-white/40">
              {{ selectedHost?.username }}@{{ selectedHost?.hostname }}:{{
                selectedHost?.port || 22
              }}
            </p>
          </div>

          <div class="overview-card rounded-lg p-3">
            <span class="mb-1 block text-xs text-white/40">Session</span>
            <span class="text-base font-bold text-white/90">{{
              sessionId ? "Attached" : "Disconnected"
            }}</span>
            <p class="mt-1 text-xs text-white/40">
              SSH {{ selectedHost?.sshEnabled ? "enabled" : "disabled" }}
            </p>
          </div>

          <div class="overview-card rounded-lg p-3">
            <span class="mb-1 block text-xs text-white/40">Containers</span>
            <span class="text-base font-bold text-white/90"
              >{{ runningContainers }}/{{ totalContainers }}</span
            >
            <p class="mt-1 text-xs text-white/40">
              {{ stoppedContainers }} stopped
            </p>
          </div>

          <div class="overview-card rounded-lg p-3">
            <span class="mb-1 block text-xs text-white/40">Services</span>
            <span class="text-base font-bold text-white/90"
              >{{ serviceUpCount }}/{{ serviceCount }}</span
            >
            <p class="mt-1 text-xs text-white/40">
              {{ serviceDownCount }} not running
            </p>
          </div>
        </div>
      </article>

      <article class="overview-panel rounded-xl p-4">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/90">Services</h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-white/40">{{ topServices.length }} shown</span>
            <button class="service-link-btn" type="button" @click="emit('open-tab', 'docker')">
              More info
            </button>
          </div>
        </header>

        <div
          v-if="topServices.length > 0"
          class="grid gap-2 sm:grid-cols-2 grid-cols-1"
        >
          <div
            v-for="service in topServices"
            :key="service.id"
            class="overview-card rounded-lg p-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-xs font-semibold text-white/90">{{
                service.name
              }}</span>
              <span
                class="h-2 w-2 rounded-full"
                :class="
                  isRunning(service.status) ? 'bg-emerald-400' : 'bg-rose-400'
                "
              />
            </div>
            <p class="mt-1 truncate text-xs text-white/40">
              {{ service.image }}
            </p>
            <p class="mt-0.5 truncate text-xs text-white/40">
              {{ service.status }}
            </p>
            <p
              v-if="service.compose?.project || service.compose?.service"
              class="mt-0.5 truncate text-xs text-sky-200/80"
            >
              {{ service.compose?.project || "standalone" }} /
              {{ service.compose?.service || "service" }}
            </p>
            <p class="mt-0.5 truncate text-xs text-white/40">
              health: {{ service.health || "none" }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs text-white/40"
        >
          No service telemetry available for this host yet.
        </div>
      </article>

      <article
        class="overview-panel rounded-xl p-4 lg:col-span-2 xl:col-span-1"
      >
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white/90">Operations</h3>
        </header>

        <QuickActions />

        <!-- <div class="mt-3">
          <ArrScheduleWidget
            :entries="arrScheduleEntries"
            title="ARR Calendar"
            compact
            :loading="arrScheduleLoading"
            :error="arrScheduleError"
          />
        </div> -->

        <div class="overview-card mt-3 rounded-lg p-2">
          <RecentActivity :host-id="hostId ?? undefined" />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import QuickActions from "../QuickActions.vue";
import RecentActivity from "../RecentActivity.vue";
import ServerStats from "../ServerStats.vue";
import { useOverviewData } from "../../composables/useOverviewData";

const props = defineProps<{
  hostId: number | null;
  sessionId: string | null;
  serverStatus: string;
}>();
const emit = defineEmits<{
  (e: "open-tab", tab: "docker"): void;
}>();

const {
  isRunning,
  runningContainers,
  selectedHost,
  serviceCount,
  serviceDownCount,
  serviceUpCount,
  statusClass,
  stoppedContainers,
  topServices,
  totalContainers,
} = useOverviewData(props);
</script>

<style scoped>
@reference "../../assets/css/main.css";

.overview-panel {
  background: rgba(20, 25, 32, 0.8);
  @apply border border-white/6 backdrop-blur-[8px];
}

.overview-card {
  background: rgba(255, 255, 255, 0.02);
  @apply border border-white/6;
}

.stats-embed {
  @apply mt-[0.1rem];
}

.service-link-btn {
  background: rgba(125, 196, 228, 0.1);
  @apply rounded-full border border-[#7dc4e4]/35 px-2 py-[0.15rem] text-[0.67rem] leading-none text-[#9ad4ee];
}

.service-link-btn:hover {
  background: rgba(125, 196, 228, 0.16);
  @apply border-[#7dc4e4]/50;
}

.status-online {
  background: rgba(139, 213, 168, 0.08);
  @apply border-[#8bd5a8]/35 text-[#8bd5a8];
}

.status-offline {
  background: rgba(242, 180, 180, 0.08);
  @apply border-[#f2b4b4]/35 text-[#f2b4b4];
}

.status-unknown {
  @apply border-white/12 text-white/40;
  background: transparent;
}
</style>
