<template>
  <aside
    class="border-l border-slate-800 bg-[#121214]/50 p-6 flex flex-col gap-6 overflow-y-auto shrink-0"
  >
    <h2 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
      System Status
    </h2>

    <!-- OFFLINE -->
    <div
      v-if="status === 'offline'"
      class="bg-[#16161a] rounded-xl p-6 border border-slate-800 text-center text-red-500 font-bold"
    >
      OFFLINE
    </div>

    <!-- AUTH FAILED -->
    <div
      v-else-if="status === 'auth_failed'"
      class="bg-[#16161a] rounded-xl p-6 border border-slate-800 text-center text-yellow-500 font-bold"
    >
      Authentication Failed
    </div>

    <!-- LOADING -->
    <div
      v-else-if="!stats"
      class="bg-[#16161a] rounded-xl p-6 border border-slate-800 text-center text-slate-400"
    >
      Loading stats…
    </div>

    <!-- CPU Widget -->
    <div v-else class="bg-[#16161a] rounded-xl p-4 border border-slate-800">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-blue-500/10 rounded-lg">
            <Cpu :size="16" class="text-blue-400" />
          </div>
          <span class="text-sm font-medium text-white">CPU Usage</span>
        </div>
        <span class="text-xs font-bold text-blue-400">
          {{ stats.cpu.usagePercent.toFixed(1) }}%
        </span>
      </div>
      <div class="h-24 flex items-end justify-between gap-[2px]">
        <TransitionGroup
          name="bar-pop"
          tag="div"
          class="flex items-end justify-between w-full h-full"
        >
          <div
            v-for="(value, index) in cpuHistory"
            :key="index"
            class="relative flex-1 h-full group"
          >
            <div
              class="absolute bottom-0 left-0 right-0"
              :style="{
                height: `${value}%`,
                transition:
                  index === cpuHistory.length - 1
                    ? 'height 0.5s ease-out'
                    : 'none',
              }"
              :class="
                index === cpuHistory.length - 1
                  ? 'bg-gradient-to-t from-blue-600/20 to-blue-400 border-t-2 border-blue-300'
                  : 'bg-gradient-to-t from-blue-600/5 to-blue-500/40 border-t-2 border-blue-400/40'
              "
            />

            <div
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-xl z-50 whitespace-nowrap"
              :style="{ bottom: `calc(${value}% + 6px)` }"
            >
              {{ value }}%
            </div>

            <div class="absolute inset-0 cursor-pointer" />
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- Memory Widget -->
    <div
      v-if="stats"
      class="bg-[#16161a] rounded-xl p-4 border border-slate-800"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-purple-500/10 rounded-lg">
            <Activity :size="16" class="text-purple-400" />
          </div>
          <span class="text-sm font-bold uppercase tracking-wide text-slate-300"
            >Memory</span
          >
        </div>
        <span class="text-sm font-mono font-bold text-purple-400">
          {{ stats.memory.percent.toFixed(1) }}%
        </span>
      </div>

      <div
        class="w-full bg-slate-800/50 h-2.5 rounded-full overflow-hidden relative mb-4"
      >
        <div
          class="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-700 relative shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          :style="{ width: stats.memory.percent + '%' }"
        >
          <div class="absolute inset-0 w-full h-full animate-shimmer">
            <div
              class="w-1/3 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center text-[11px] font-mono">
        <span class="text-slate-500"
          >TOTAL: {{ formatBytes(stats.memory.total) }}</span
        >
        <span class="text-slate-300">
          <b class="text-white">{{ formatBytes(stats.memory.used) }}</b> used
        </span>
      </div>
    </div>

    <!-- Disk Widget -->
    <div
      v-if="stats"
      class="bg-[#16161a] rounded-xl p-4 border border-slate-800"
    >
      <div class="space-y-6">
        <div v-for="disk in stats.disk" :key="disk.mount">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-emerald-500/10 rounded-lg">
                <HardDrive :size="16" class="text-emerald-400" />
              </div>
              <span
                class="text-sm font-bold uppercase tracking-wide text-slate-300"
                >Storage</span
              >
              <span class="text-[10px] text-slate-500 font-mono ml-1">{{
                disk.mount
              }}</span>
            </div>
            <span class="text-sm font-mono font-bold text-emerald-400">
              {{ disk.percent }}
            </span>
          </div>

          <div
            class="w-full bg-slate-800/50 h-2.5 rounded-full overflow-hidden relative mb-4"
          >
            <div
              class="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              :style="{ width: disk.percent }"
            >
              <div class="absolute inset-0 w-full h-full animate-shimmer">
                <div
                  class="w-1/3 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center text-[11px] font-mono">
            <span class="text-slate-500 uppercase"
              >Total: {{ disk.total }}</span
            >
            <span class="text-slate-300">
              <b class="text-white">{{ disk.used }}</b> used
            </span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Cpu, Activity, HardDrive } from "lucide-vue-next";

const props = defineProps<{ hostId: number }>();

const stats = ref<any>(null);
const status = ref("loading");

const CPU_HISTORY_SIZE = 20;
const cpuHistory = ref<number[]>([]);

let intervalId: number | null = null;

const fetchStats = async () => {
  if (!props.hostId) return;

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/stats/${props.hostId}`,
    );

    if (!res.ok) {
      const errorData = await res.json();
      status.value = errorData.status || "offline";
      stats.value = null;
      return;
    }

    const data = await res.json();
    stats.value = data;
    status.value = "online";

    const cpuPercent = Math.min(100, Math.max(0, data.cpu.usagePercent));

    cpuHistory.value.push(cpuPercent);
    if (cpuHistory.value.length > CPU_HISTORY_SIZE) {
      cpuHistory.value.shift();
    }
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    status.value = "offline";
    stats.value = null;
  }
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const formattedValue = (bytes / Math.pow(k, i)).toFixed(2);

  return `${formattedValue} ${sizes[i]}`;
};

onMounted(() => {
  fetchStats();
  intervalId = setInterval(fetchStats, 5000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(
  () => props.hostId,
  () => {
    stats.value = null;
    status.value = "loading";
    cpuHistory.value = [];

    if (intervalId) clearInterval(intervalId);
    fetchStats();
    intervalId = setInterval(fetchStats, 5000);
  },
);
</script>
<style scoped>
.bar-pop-enter-active {
  transition: all 0.4s ease-out;
}
.bar-pop-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
/* @keyframes shimmer {
  0% {
    transform: translateX(-150%) skewX(-20deg);
  }
  100% {
    transform: translateX(150%) skewX(-20deg);
  }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
} */
</style>
