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
.recent-activity {
  position: relative;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  padding: 0.8rem;
}

.activity-item:hover {
  background: rgba(127, 161, 195, 0.08);
  border-color: rgba(127, 161, 195, 0.15);
  transform: translateX(2px);
}

.activity-item:hover .activity-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.activity-icon-wrapper {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(127, 161, 195, 0.1);
  border: 1px solid rgba(127, 161, 195, 0.15);
  border-radius: 8px;
}

.activity-icon {
  width: 14px;
  height: 14px;
  color: #7fa1c3;
  stroke-width: 2;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-details {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.activity-details :deep(code) {
  background: rgba(10, 14, 18, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #e8c368;
  padding: 0.0625rem 0.375rem;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
}

.activity-details :deep(strong) {
  color: #b19dd4;
  font-weight: 600;
}

.activity-time {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'JetBrains Mono', monospace;
}

.activity-arrow {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: all 0.2s ease;
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #16161a 0%, #0f1419 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 10000;
}

.modal-header {
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(127, 161, 195, 0.15);
  border: 1px solid rgba(127, 161, 195, 0.2);
  border-radius: 12px;
}

.modal-icon {
  width: 20px;
  height: 20px;
  color: #7fa1c3;
  stroke-width: 2;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.modal-time {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'JetBrains Mono', monospace;
  margin: 0;
}

.modal-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.detail-value {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
}

.detail-value-host {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #b19dd4;
}

.detail-value-code {
  background: rgba(10, 14, 18, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 1rem;
}

.detail-value-code code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: #e8c368;
  word-break: break-all;
  white-space: pre-wrap;
}

.detail-value-mono {
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.6);
}

.action-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: rgba(127, 161, 195, 0.15);
  border: 1px solid rgba(127, 161, 195, 0.2);
  border-radius: 8px;
  color: #7fa1c3;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: capitalize;
}

/* Modal animations */
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