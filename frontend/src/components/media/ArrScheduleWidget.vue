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
.arr-schedule {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(20, 25, 32, 0.8);
  border-radius: 12px;
  padding: 0.75rem;
}

.arr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.65rem;
  gap: 0.75rem;
}

.arr-title-wrap {
  min-width: 0;
}

.arr-header h3 {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.82rem;
  letter-spacing: -0.01em;
}

.arr-count {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.64rem;
  margin-top: 0.14rem;
}

.arr-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.arr-nav-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.75);
  border-radius: 6px;
  font-size: 0.62rem;
  padding: 0.16rem 0.42rem;
  cursor: pointer;
}

.arr-nav-btn:not(:disabled):hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}

.arr-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arr-month {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.66rem;
  white-space: nowrap;
}

.arr-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.arr-weekdays span {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.58rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.arr-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.arr-day-cell {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  min-height: 84px;
  padding: 0.33rem;
}

.arr-day-cell.empty {
  opacity: 0.28;
  min-height: 44px;
}

.arr-day-cell.today {
  border-color: rgba(127, 161, 195, 0.45);
}

.arr-day-cell.has-events {
  border-color: rgba(255, 255, 255, 0.12);
}

.arr-day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.arr-day-number {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.62rem;
}

.arr-day-count {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.56rem;
}

.arr-day-events {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.arr-event {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  padding: 0.15rem 0.22rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.arr-event .arr-source {
  flex-shrink: 0;
}

.arr-event-title {
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.54rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arr-more {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.52rem;
}

.arr-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.arr-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 0.42rem 0.5rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}

.arr-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.arr-title {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arr-source {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.08rem 0.28rem;
  color: rgba(255, 255, 255, 0.6);
}

.arr-source.sonarr {
  color: #a3c4e8;
  border-color: rgba(163, 196, 232, 0.35);
}

.arr-source.radarr {
  color: #8bd5a8;
  border-color: rgba(139, 213, 168, 0.35);
}

.arr-date {
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.63rem;
  white-space: nowrap;
}

.arr-empty {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.6rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.66rem;
}

.arr-schedule.compact {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
  padding: 0.6rem;
}

.arr-schedule.compact .arr-day-cell {
  min-height: 64px;
}

.arr-unscheduled {
  margin-top: 0.55rem;
}

.arr-unscheduled h4 {
  margin: 0 0 0.35rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
