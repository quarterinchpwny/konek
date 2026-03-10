import { computed, ref } from "vue";
import { createConfigPayload } from "@/composables/media/constants";
import {
  MediaRequestError,
  type MediaConfig,
  type MediaServiceType,
  type SaveConfigPayload,
  type TestConnectionResult,
} from "@/types/media";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const stringifyError = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Service request failed";
};

export const useMediaConfigs = () => {
  const configs = ref<MediaConfig[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isTestingConnection = ref(false);
  const isModalOpen = ref(false);
  const modalStep = ref<"list" | "form">("list");
  const editingService = ref<MediaServiceType>("sonarr");
  const configForm = ref<SaveConfigPayload>(createConfigPayload("sonarr"));
  const testResult = ref<TestConnectionResult | null>(null);
  const isApiKeyVisible = ref(false);

  const hasAnyConfigured = computed(() => configs.value.length > 0);
  const configsByService = computed(() => {
    return configs.value.reduce(
      (map, config) => {
        map[config.serviceType] = config;
        return map;
      },
      {} as Partial<Record<MediaServiceType, MediaConfig>>,
    );
  });

  const resetModal = () => {
    modalStep.value = "list";
    editingService.value = "sonarr";
    configForm.value = createConfigPayload("sonarr");
    testResult.value = null;
    isApiKeyVisible.value = false;
  };

  const fetchConfigs = async (hostId?: number) => {
    if (!hostId) {
      configs.value = [];
      return;
    }

    isLoading.value = true;

    try {
      const response = await fetch(`${baseUrl}/hosts/${hostId}/media`);

      if (!response.ok) {
        throw new MediaRequestError("Failed to fetch media configs", response.status);
      }

      configs.value = (await response.json()) as MediaConfig[];
    } finally {
      isLoading.value = false;
    }
  };

  const openModal = () => {
    resetModal();
    isModalOpen.value = true;
  };

  const editService = (type: MediaServiceType) => {
    const existing = configsByService.value[type];
    editingService.value = type;
    configForm.value = {
      serviceType: type,
      url: existing?.url || "",
      apiKey: existing?.apiKey || "",
      enabled: existing ? Boolean(existing.enabled) : true,
    };
    testResult.value = null;
    isApiKeyVisible.value = false;
    modalStep.value = "form";
  };

  const closeModal = () => {
    isModalOpen.value = false;
    resetModal();
  };

  const testConnection = async (hostId?: number) => {
    if (!hostId) {
      return;
    }

    if (!configForm.value.url || !configForm.value.apiKey) {
      testResult.value = { success: false, message: "URL and API key are required" };
      return;
    }

    isTestingConnection.value = true;
    testResult.value = null;

    try {
      const response = await fetch(`${baseUrl}/hosts/${hostId}/media/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm.value),
      });

      if (!response.ok) {
        throw new MediaRequestError("Connection test failed", response.status);
      }

      testResult.value = (await response.json()) as TestConnectionResult;
    } catch (error) {
      testResult.value = { success: false, message: stringifyError(error) };
    } finally {
      isTestingConnection.value = false;
    }
  };

  const saveConfig = async (hostId: number | undefined, onSaved: () => Promise<void>) => {
    if (!hostId) {
      return;
    }

    if (!configForm.value.url) {
      testResult.value = { success: false, message: "URL is required" };
      return;
    }

    isSaving.value = true;

    try {
      const response = await fetch(`${baseUrl}/hosts/${hostId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm.value),
      });

      if (!response.ok) {
        throw new MediaRequestError("Save failed", response.status);
      }

      await onSaved();
      closeModal();
    } catch (error) {
      testResult.value = { success: false, message: stringifyError(error) };
    } finally {
      isSaving.value = false;
    }
  };

  return {
    configs,
    configsByService,
    hasAnyConfigured,
    isLoading,
    isSaving,
    isTestingConnection,
    isModalOpen,
    modalStep,
    editingService,
    configForm,
    isApiKeyVisible,
    testResult,
    fetchConfigs,
    openModal,
    editService,
    closeModal,
    testConnection,
    saveConfig,
  };
};
