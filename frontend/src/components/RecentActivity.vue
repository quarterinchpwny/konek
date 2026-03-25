<template>
  <div class="recent-activity">
    <div class="section-header">
      <h3 class="section-title">Recent Activity</h3>
    </div>
    <div v-if="displayedActivities.length > 0" class="activity-list">
      <button v-for="activity in displayedActivities" :key="activity.id" @click="openModal(activity)"
        class="activity-item">
        <div class="activity-icon-wrapper">
          <component :is="getIconForActivity(activity.actionType)" class="activity-icon" />
        </div>
        <div class="activity-content">
          <p class="activity-details" v-html="formatActivityText(activity)"></p>
          <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
        </div>
        <div class="activity-arrow">
          <ChevronRight :size="14" />
        </div>
      </button>
    </div>
    <div v-else class="empty-state">
      <p>No recent system activity.</p>
    </div>
  </div>

  <!-- Activity Detail Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="selectedActivity" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-header-top">
              <div class="modal-icon-wrapper">
                <component :is="getIconForActivity(selectedActivity.actionType)" class="modal-icon" />
              </div>
              <button @click="closeModal" class="modal-close">
                <X :size="20" />
              </button>
            </div>
            <h2 class="modal-title">{{ getActionTitle(selectedActivity.actionType) }}</h2>
            <p class="modal-time">{{ formatFullTime(selectedActivity.createdAt) }}</p>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <div class="detail-label">Action Type</div>
              <div class="detail-value">
                <span class="action-badge">{{ selectedActivity.actionType }}</span>
              </div>
            </div>

            <div v-if="selectedActivity.hostAlias" class="detail-section">
              <div class="detail-label">Host</div>
              <div class="detail-value detail-value-host">
                <Server :size="14" />
                <span>{{ selectedActivity.hostAlias }}</span>
              </div>
            </div>

            <div v-if="selectedActivity.details" class="detail-section">
              <div class="detail-label">Details</div>
              <div class="detail-value detail-value-code">
                <code>{{ selectedActivity.details }}</code>
              </div>
            </div>

            <div class="detail-section">
              <div class="detail-label">Activity ID</div>
              <div class="detail-value detail-value-mono">
                #{{ selectedActivity.id }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';
import { Terminal, File, UploadCloud, Trash2, Eye, ChevronRight, X, Server } from 'lucide-vue-next';

interface Activity {
  id: number;
  actionType: string;
  details: string | null;
  createdAt: string;
  hostAlias?: string;
  hostId: number;
}

const props = defineProps<{
  hostId?: number;
}>();

const activities = ref<Activity[]>([]);
const selectedActivity = ref<Activity | null>(null);
let fetchInterval: number | null = null;

// Only show the 3 most recent activities to fit without scrolling
const displayedActivities = computed(() => activities.value.slice(0, 3));

const fetchActivities = async () => {
  try {
    const params = props.hostId ? { hostId: props.hostId } : {};
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/activity`, { params });
    activities.value = response.data;
  } catch (error) {
    console.error('Could not fetch activities:', error);
  }
};

const openModal = (activity: Activity) => {
  selectedActivity.value = activity;
};

const closeModal = () => {
  selectedActivity.value = null;
};

const getActionTitle = (actionType: string): string => {
  const titles: Record<string, string> = {
    command: 'Command Execution',
    view: 'File Viewed',
    upload: 'File Upload',
    delete: 'File Deletion',
  };
  return titles[actionType] || actionType.charAt(0).toUpperCase() + actionType.slice(1);
};

const timeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return '';
  return timeAgo(new Date(timestamp));
};

const formatFullTime = (timestamp: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatActivityText = (activity: Activity) => {
  const onHost = activity.hostAlias ? ` on <strong>${activity.hostAlias}</strong>` : '';
  const details = activity.details ? `<code>${activity.details}</code>` : '';

  switch (activity.actionType) {
    case 'command':
      return `Executed ${details}${onHost}`;
    case 'view':
      return `Viewed ${details}${onHost}`;
    case 'upload':
      return `Uploaded a file to ${details}${onHost}`;
    case 'delete':
      return `Deleted ${details}${onHost}`;
    default:
      return `${activity.actionType}: ${details}${onHost}`;
  }
};

const getIconForActivity = (actionType: string) => {
  switch (actionType) {
    case 'command': return Terminal;
    case 'view': return Eye;
    case 'upload': return UploadCloud;
    case 'delete': return Trash2;
    default: return File;
  }
};

onMounted(() => {
  fetchActivities();
  fetchInterval = setInterval(fetchActivities, 5000);
});

onUnmounted(() => {
  if (fetchInterval) {
    clearInterval(fetchInterval);
  }
});

watch(() => props.hostId, () => {
  fetchActivities();
});
</script>

<style scoped>
@reference "../assets/css/main.css";

.recent-activity {
  @apply relative;
}

.section-header {
  @apply mb-4 flex items-center justify-between px-2;
}

.section-title {
  @apply text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/40;
}

.activity-list {
  @apply flex flex-col gap-3;
}

.activity-item {
  background: rgba(20, 25, 32, 0.5);
  @apply flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/6 p-[0.8rem] text-left transition-all duration-200;
}

.activity-item:hover {
  background: rgba(127, 161, 195, 0.08);
  @apply border-[#7fa1c3]/15;
  transform: translateX(2px);
}

.activity-item:hover .activity-arrow {
  @apply opacity-100;
  transform: translateX(2px);
}

.activity-icon-wrapper {
  background: rgba(127, 161, 195, 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#7fa1c3]/15;
}

.activity-icon {
  color: #7fa1c3;
  stroke-width: 2;
  @apply h-[14px] w-[14px];
}

.activity-content {
  @apply min-w-0 flex-1;
}

.activity-details {
  @apply m-0 mb-1 text-[0.8125rem] leading-[1.4] text-white/80;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.activity-details :deep(code) {
  background: rgba(10, 14, 18, 0.7);
  @apply rounded border border-white/5 px-1.5 py-[0.0625rem] text-[#e8c368];
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
}

.activity-details :deep(strong) {
  color: #b19dd4;
  font-weight: 600;
}

.activity-time {
  font-family: 'JetBrains Mono', monospace;
  @apply text-[0.6875rem] text-white/40;
}

.activity-arrow {
  @apply shrink-0 text-white/30 opacity-0 transition-all duration-200;
}

.empty-state {
  @apply px-0 py-6 text-center text-sm text-white/40;
}

.modal-overlay {
  background: rgba(0, 0, 0, 0.85);
  @apply fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-[12px];
}

.modal-content {
  background: linear-gradient(180deg, #16161a 0%, #0f1419 100%);
  @apply relative z-[10000] w-full max-w-[480px] overflow-hidden rounded-[20px] border border-white/8;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  @apply border-b border-white/6 px-8 pb-6 pt-8;
}

.modal-header-top {
  @apply mb-4 flex items-center justify-between;
}

.modal-icon-wrapper {
  background: rgba(127, 161, 195, 0.15);
  @apply flex h-12 w-12 items-center justify-center rounded-xl border border-[#7fa1c3]/20;
}

.modal-icon {
  color: #7fa1c3;
  stroke-width: 2;
  @apply h-5 w-5;
}

.modal-close {
  background: transparent;
  @apply flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-white/50 transition-all duration-200;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  @apply text-white;
}

.modal-title {
  @apply m-0 mb-2 text-xl font-bold tracking-[-0.02em] text-white;
}

.modal-time {
  font-family: 'JetBrains Mono', monospace;
  @apply m-0 text-sm text-white/50;
}

.modal-body {
  @apply flex flex-col gap-6 p-8;
}

.detail-section {
  @apply flex flex-col gap-2;
}

.detail-label {
  @apply text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/50;
}

.detail-value {
  @apply text-[0.9375rem] text-white/90;
}

.detail-value-host {
  @apply flex items-center gap-2 text-[#b19dd4];
}

.detail-value-code {
  background: rgba(10, 14, 18, 0.6);
  @apply rounded-lg border border-white/6 p-4;
}

.detail-value-code code {
  font-family: 'JetBrains Mono', monospace;
  @apply whitespace-pre-wrap break-all text-sm text-[#e8c368];
}

.detail-value-mono {
  font-family: 'JetBrains Mono', monospace;
  @apply text-white/60;
}

.action-badge {
  background: rgba(127, 161, 195, 0.15);
  @apply inline-flex items-center rounded-lg border border-[#7fa1c3]/20 px-3 py-1.5 text-[0.8125rem] font-semibold capitalize text-[#7fa1c3];
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>
