<template>
  <div class="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(13,18,23,0.96),rgba(9,13,18,0.98))]">
    <div class="border-b border-white/8 bg-[linear-gradient(180deg,rgba(49,55,66,0.98),rgba(28,33,41,0.96))] px-[0.45rem] pt-[0.6rem] md:px-[0.9rem] md:pt-3">
      <div class="flex items-end gap-[0.3rem] overflow-x-auto px-[0.2rem]">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="group relative inline-flex h-[2.45rem] min-w-[8.2rem] max-w-44 translate-y-px items-center gap-[0.7rem] whitespace-nowrap rounded-t-[12px] border border-b-0 px-[0.9rem] pb-[0.7rem] pt-[0.55rem] text-white/[0.82] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background,border-color,color,box-shadow] duration-150 md:min-w-40 md:max-w-56"
          :class="
            tab.id === activeTabId
              ? 'z-[1] border-white/16 bg-[linear-gradient(180deg,rgba(23,28,35,1),rgba(16,20,26,1))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_-8px_18px_rgba(0,0,0,0.14)]'
              : 'border-white/12 bg-[linear-gradient(180deg,rgba(66,73,84,0.92),rgba(39,45,55,0.9))] hover:bg-[linear-gradient(180deg,rgba(76,84,96,0.96),rgba(45,51,61,0.94))] hover:text-[#f4f7fb]'
          "
          @click="activeTabId = tab.id"
        >
          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis">{{ tab.name }}</span>
          <span
            class="flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-white/[0.04] text-white/[0.62] transition-colors duration-150 group-hover:bg-white/[0.09] group-hover:text-white/90"
            :class="tab.id === activeTabId ? 'bg-white/[0.09] text-white/90' : ''"
            @click.stop="closeTab(tab.id)"
          >
            x
          </span>
        </button>
        <button
          type="button"
          class="mb-[0.15rem] h-8 w-[2.2rem] rounded-t-[10px] border border-b-0 border-white/10 bg-[linear-gradient(180deg,rgba(74,82,95,0.78),rgba(41,47,56,0.82))] text-[1.1rem] leading-none text-white/[0.82] transition-colors duration-150 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading"
          title="New tab"
          aria-label="New tab"
          @click="createTab"
        >
          +
        </button>
      </div>
    </div>
    <div v-if="errorMessage" class="flex flex-1 flex-col items-center justify-center gap-[0.85rem] px-4 text-center text-[#f0b4b4]">
      <p>{{ errorMessage }}</p>
      <button
        type="button"
        class="rounded-full border border-[#7fa1c3]/24 bg-[#7fa1c3]/14 px-[0.9rem] py-[0.55rem] text-[#dfe9f3] transition-colors duration-150 hover:bg-[#7fa1c3]/20 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        @click="loadTabs"
      >
        Retry
      </button>
    </div>
    <div v-else-if="activeTab" class="min-h-0 flex-1 border-t border-white/8">
      <SshAttachTerminal
        :key="terminalKey"
        :session-id="sessionId"
        :host-id="hostId"
        :terminal-tab-id="activeTab.id"
        :label="activeTab.name"
      />
    </div>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-[0.85rem] px-4 text-center text-white/[0.72]">
      <p>{{ isLoading ? "Preparing terminal..." : "No terminal tabs open." }}</p>
      <button
        type="button"
        class="rounded-full border border-[#7fa1c3]/24 bg-[#7fa1c3]/14 px-[0.9rem] py-[0.55rem] text-[#dfe9f3] transition-colors duration-150 hover:bg-[#7fa1c3]/20 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        @click="createTab"
      >
        Open tab
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import axios from "axios";

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
