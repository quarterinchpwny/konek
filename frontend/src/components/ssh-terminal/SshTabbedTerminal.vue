<template>
  <div class="terminal-shell">
    <div class="tab-bar">
      <div class="tab-list">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-chip"
          :class="{ 'tab-chip-active': tab.id === activeTabId }"
          @click="activeTabId = tab.id"
        >
          <span class="tab-chip-label">{{ tab.name }}</span>
          <span class="tab-chip-close" @click.stop="closeTab(tab.id)">x</span>
        </button>
        <button
          type="button"
          class="tab-action"
          :disabled="isLoading"
          title="New tab"
          aria-label="New tab"
          @click="createTab"
        >
          +
        </button>
      </div>
    </div>
    <div v-if="errorMessage" class="terminal-state terminal-state-error">
      <p>{{ errorMessage }}</p>
      <button type="button" class="state-action" :disabled="isLoading" @click="loadTabs">
        Retry
      </button>
    </div>
    <div v-else-if="activeTab" class="terminal-stage">
      <SshAttachTerminal
        :key="terminalKey"
        :session-id="sessionId"
        :host-id="hostId"
        :terminal-tab-id="activeTab.id"
        :label="activeTab.name"
      />
    </div>
    <div v-else class="terminal-state">
      <p>{{ isLoading ? "Preparing terminal..." : "No terminal tabs open." }}</p>
      <button type="button" class="state-action" :disabled="isLoading" @click="createTab">
        Open tab
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import axios from "axios";
import "./ssh-tabbed-terminal.css";

import SshAttachTerminal from "./SshAttachTerminal.vue";
import {
  closeTerminalTab,
  createTerminalTab,
  listTerminalTabs,
  type TerminalTabSummary,
} from "../../services/terminal-tabs";

const props = defineProps<{
  sessionId: string;
  hostId?: number | null;
}>();

const tabs = ref<TerminalTabSummary[]>([]);
const activeTabId = ref<string | null>(null);
const errorMessage = ref("");
const isLoading = ref(false);
const renderNonce = ref(0);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      error.response?.data?.error || error.response?.data?.message;
    return responseMessage || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const activeTab = computed(
  () => tabs.value.find((tab) => tab.id === activeTabId.value) ?? null,
);

const terminalKey = computed(() => {
  const activeId = activeTab.value?.id || "empty";
  return `${props.sessionId}-${activeId}-${renderNonce.value}`;
});

const syncActiveTab = () => {
  if (!tabs.value.length) {
    activeTabId.value = null;
    return;
  }

  if (!activeTabId.value || !tabs.value.some((tab) => tab.id === activeTabId.value)) {
    const firstTab = tabs.value[0];
    if (!firstTab) {
      activeTabId.value = null;
      return;
    }
    activeTabId.value = firstTab.id;
    renderNonce.value += 1;
  }
};

const loadTabs = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    tabs.value = await listTerminalTabs(props.sessionId);
    syncActiveTab();

    if (!tabs.value.length) {
      await createTab();
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "Failed to load terminal tabs.");
  } finally {
    isLoading.value = false;
  }
};

const createTab = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const tab = await createTerminalTab(props.sessionId);
    tabs.value = [...tabs.value, tab];
    activeTabId.value = tab.id;
    renderNonce.value += 1;
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "Failed to create terminal tab.");
  } finally {
    isLoading.value = false;
  }
};

const closeTab = async (tabId: string) => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await closeTerminalTab(props.sessionId, tabId);
    tabs.value = tabs.value.filter((tab) => tab.id !== tabId);

    if (activeTabId.value === tabId) {
      activeTabId.value = tabs.value[0]?.id ?? null;
      renderNonce.value += 1;
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "Failed to close terminal tab.");
  } finally {
    isLoading.value = false;
  }
};

watch(activeTabId, () => {
  renderNonce.value += 1;
});

watch(
  () => props.sessionId,
  () => {
    tabs.value = [];
    activeTabId.value = null;
    renderNonce.value += 1;
    void loadTabs();
  },
);

onMounted(() => {
  void loadTabs();
});
</script>
