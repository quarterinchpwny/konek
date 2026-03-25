<template>
  <article class="arr-schedule" :class="{ compact }">
    <header class="arr-header">
      <div class="arr-title-wrap">
        <h3>{{ title }}</h3>
        <span class="arr-count">{{ monthEntryCount }} this month · {{ entries.length }} total</span>
      </div>
      <div class="arr-nav">
        <button class="arr-nav-btn" @click="goPrevMonth" :disabled="loading">
          <span>Prev</span>
        </button>
        <span class="arr-month">{{ monthLabel }}</span>
        <button class="arr-nav-btn" @click="goToCurrentMonth" :disabled="loading">
          <span>Today</span>
        </button>
        <button class="arr-nav-btn" @click="goNextMonth" :disabled="loading">
          <span>Next</span>
        </button>
      </div>
    </header>

    <div class="arr-weekdays">
      <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
    </div>

    <div class="arr-grid">
      <div
        v-for="cell in monthCells"
        :key="cell.key"
        class="arr-day-cell"
        :class="{
          empty: !cell.dayNumber,
          today: cell.isToday,
          'has-events': cell.events.length > 0,
        }"
      >
        <template v-if="cell.dayNumber">
          <div class="arr-day-head">
            <span class="arr-day-number">{{ cell.dayNumber }}</span>
            <span v-if="cell.events.length" class="arr-day-count">
              {{ cell.events.length }}
            </span>
          </div>

          <div class="arr-day-events">
            <div
              v-for="entry in visibleEvents(cell.events)"
              :key="`${entry.source}-${entry.id}-${entry.date}`"
              class="arr-event"
              :title="entry.title"
            >
              <span class="arr-source" :class="entry.source">{{ entry.source }}</span>
              <span class="arr-event-title">{{ entry.title }}</span>
            </div>
            <div
              v-if="hiddenCount(cell.events) > 0"
              class="arr-more"
            >
              +{{ hiddenCount(cell.events) }} more
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="loading" class="arr-empty">
      Loading ARR calendar…
    </div>
    <div v-else-if="error" class="arr-empty">
      {{ error }}
    </div>
    <div v-else-if="!entries.length" class="arr-empty">
      No upcoming Sonarr or Radarr releases found.
    </div>

    <div v-if="unscheduledEntries.length" class="arr-unscheduled">
      <h4>Unscheduled</h4>
      <div class="arr-list">
        <div
          v-for="entry in unscheduledEntries"
          :key="`unscheduled-${entry.source}-${entry.id}`"
          class="arr-item"
        >
          <div class="arr-info">
            <span class="arr-title">{{ entry.title }}</span>
            <span class="arr-source" :class="entry.source">{{ entry.source }}</span>
          </div>
          <span class="arr-date">{{ entry.date }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { UpcomingItem } from "@/types/media";

const props = withDefaults(
  defineProps<{
  entries: UpcomingItem[];
    title?: string;
    compact?: boolean;
    loading?: boolean;
    error?: string | null;
  }>(),
  {
    title: "ARR Calendar",
    compact: false,
    loading: false,
    error: null,
  },
);

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const activeMonth = ref(toMonthStart(new Date()));
const today = new Date();
const hasManualMonthSelection = ref(false);

const monthLabel = computed(() =>
  activeMonth.value.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  }),
);

const monthStart = computed(
  () => new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth(), 1),
);

const daysInMonth = computed(
  () => new Date(activeMonth.value.getFullYear(), activeMonth.value.getMonth() + 1, 0).getDate(),
);

const scheduledEntries = computed(() =>
  props.entries.filter((entry) => entry.scheduledAt != null),
);

const monthEntryCount = computed(() =>
  scheduledEntries.value.filter((entry) => {
    const date = new Date(entry.scheduledAt as number);
    return (
      date.getFullYear() === activeMonth.value.getFullYear()
      && date.getMonth() === activeMonth.value.getMonth()
    );
  }).length,
);

const unscheduledEntries = computed(() =>
  props.entries
    .filter((entry) => entry.scheduledAt == null)
    .slice(0, props.compact ? 2 : 5),
);

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const eventsByDate = computed(() => {
  const map = new Map<string, UpcomingItem[]>();

  for (const entry of scheduledEntries.value) {
    const eventDate = new Date(entry.scheduledAt as number);
    const key = toDateKey(eventDate);
    const current = map.get(key) ?? [];
    current.push(entry);
    map.set(key, current);
  }

  for (const [key, items] of map.entries()) {
    map.set(
      key,
      [...items].sort((a, b) => {
        if (a.scheduledAt == null && b.scheduledAt == null) return 0;
        if (a.scheduledAt == null) return 1;
        if (b.scheduledAt == null) return -1;
        return a.scheduledAt - b.scheduledAt;
      }),
    );
  }

  return map;
});

const monthCells = computed(() => {
  const firstWeekday = monthStart.value.getDay();
  const totalDays = daysInMonth.value;
  const cells: Array<{
    key: string;
    dayNumber: number | null;
    events: UpcomingItem[];
    isToday: boolean;
  }> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      key: `pad-start-${i}`,
      dayNumber: null,
      events: [],
      isToday: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const current = new Date(
      activeMonth.value.getFullYear(),
      activeMonth.value.getMonth(),
      day,
    );
    const key = toDateKey(current);
    cells.push({
      key: `day-${key}`,
      dayNumber: day,
      events: eventsByDate.value.get(key) ?? [],
      isToday: current.toDateString() === today.toDateString(),
    });
  }

  const padEnd = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < padEnd; i += 1) {
    cells.push({
      key: `pad-end-${i}`,
      dayNumber: null,
      events: [],
      isToday: false,
    });
  }

  return cells;
});

const visibleEvents = (events: UpcomingItem[]) => {
  return events.slice(0, props.compact ? 1 : 2);
};

const hiddenCount = (events: UpcomingItem[]) => {
  const limit = props.compact ? 1 : 2;
  return Math.max(0, events.length - limit);
};

const goPrevMonth = () => {
  hasManualMonthSelection.value = true;
  activeMonth.value = new Date(
    activeMonth.value.getFullYear(),
    activeMonth.value.getMonth() - 1,
    1,
  );
};

const goToCurrentMonth = () => {
  hasManualMonthSelection.value = true;
  activeMonth.value = toMonthStart(new Date());
};

const goNextMonth = () => {
  hasManualMonthSelection.value = true;
  activeMonth.value = new Date(
    activeMonth.value.getFullYear(),
    activeMonth.value.getMonth() + 1,
    1,
  );
};

watch(
  scheduledEntries,
  (entries) => {
    if (hasManualMonthSelection.value || entries.length === 0) {
      return;
    }

    const sorted = [...entries].sort((a, b) => {
      if (a.scheduledAt == null && b.scheduledAt == null) return 0;
      if (a.scheduledAt == null) return 1;
      if (b.scheduledAt == null) return -1;
      return a.scheduledAt - b.scheduledAt;
    });

    const nowTs = Date.now();
    const target = sorted.find((entry) => (entry.scheduledAt as number) >= nowTs) ?? sorted[0];
    if (!target?.scheduledAt) {
      return;
    }
    activeMonth.value = toMonthStart(new Date(target.scheduledAt));
  },
  { immediate: true },
);
</script>

<style scoped>
@reference "../../assets/css/main.css";

.arr-schedule {
  @apply rounded-xl border border-white/6 bg-[rgba(20,25,32,0.8)] p-3;
}

.arr-header {
  @apply mb-[0.65rem] flex items-start justify-between gap-3;
}

.arr-title-wrap {
  @apply min-w-0;
}

.arr-header h3 {
  @apply text-[0.82rem] tracking-[-0.01em] text-white/90;
}

.arr-count {
  @apply mt-0.5 block text-[0.64rem] text-white/40;
}

.arr-nav {
  @apply inline-flex items-center gap-1.5;
}

.arr-nav-btn {
  @apply cursor-pointer rounded-md border border-white/10 bg-white/[0.02] px-[0.42rem] py-[0.16rem] text-[0.62rem] text-white/75 transition-colors;
}

.arr-nav-btn:not(:disabled):hover {
  @apply border-white/20 text-white/90;
}

.arr-nav-btn:disabled {
  @apply cursor-not-allowed opacity-50;
}

.arr-month {
  @apply whitespace-nowrap text-[0.66rem] text-white/80;
}

.arr-weekdays,
.arr-grid {
  @apply grid grid-cols-7 gap-[0.35rem];
}

.arr-weekdays {
  @apply mb-[0.35rem];
}

.arr-weekdays span {
  @apply text-center text-[0.58rem] uppercase tracking-[0.04em] text-white/40;
}

.arr-day-cell {
  @apply min-h-[84px] rounded-lg border border-white/6 bg-white/[0.02] p-[0.33rem];
}

.arr-day-cell.empty {
  @apply min-h-[44px] opacity-30;
}

.arr-day-cell.today {
  @apply border-[#7fa1c373];
}

.arr-day-cell.has-events {
  @apply border-white/12;
}

.arr-day-head {
  @apply mb-[0.2rem] flex items-center justify-between;
}

.arr-day-number {
  @apply text-[0.62rem] text-white/80;
}

.arr-day-count {
  @apply text-[0.56rem] text-white/45;
}

.arr-day-events {
  @apply flex flex-col gap-[0.2rem];
}

.arr-event {
  @apply flex items-center gap-[0.2rem] rounded-md border border-white/8 bg-black/12 px-[0.22rem] py-[0.15rem];
}

.arr-event .arr-source {
  @apply shrink-0;
}

.arr-event-title {
  @apply truncate text-[0.54rem] leading-[1.2] text-white/80;
}

.arr-more {
  @apply text-[0.52rem] text-white/45;
}

.arr-list {
  @apply flex flex-col gap-[0.35rem];
}

.arr-item {
  @apply flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-[0.42rem];
}

.arr-info {
  @apply flex min-w-0 items-center gap-[0.4rem];
}

.arr-title {
  @apply truncate text-[0.7rem] text-white/85;
}

.arr-source {
  @apply rounded-full border border-white/14 px-[0.28rem] py-[0.08rem] text-[0.55rem] uppercase tracking-[0.06em] text-white/60;
}

.arr-source.sonarr {
  @apply border-[#a3c4e859] text-[#a3c4e8];
}

.arr-source.radarr {
  @apply border-[#8bd5a859] text-[#8bd5a8];
}

.arr-date {
  @apply whitespace-nowrap text-[0.63rem] text-white/40;
}

.arr-empty {
  @apply rounded-lg border border-dashed border-white/20 p-[0.6rem] text-[0.66rem] text-white/45;
}

.arr-schedule.compact {
  @apply border-white/6 bg-white/[0.02] p-[0.6rem];
}

.arr-schedule.compact .arr-day-cell {
  @apply min-h-16;
}

.arr-unscheduled {
  @apply mt-[0.55rem];
}

.arr-unscheduled h4 {
  @apply mb-[0.35rem] text-[0.6rem] uppercase tracking-[0.05em] text-white/45;
}
</style>
