<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content" aria-modal="true" role="dialog">
        <div class="modal-header">
          <div>
            <h3>{{ step === "list" ? "Configure Services" : `Configure ${serviceLabel}` }}</h3>
            <p class="modal-subtitle">{{ step === "list" ? "Choose a service to edit." : "Update the connection details and validate them." }}</p>
          </div>
          <button class="close-btn" aria-label="Close media configuration" @click="$emit('close')">
            <Icon icon="mdi:close" />
          </button>
        </div>

        <div v-if="step === 'list'" class="modal-body">
          <div class="service-list">
            <button
              v-for="service in services"
              :key="service.type"
              class="service-row"
              @click="$emit('editService', service.type)"
            >
              <div class="service-info">
                <Icon :icon="service.icon" class="service-icon" />
                <div>
                  <span class="service-name">{{ service.name }}</span>
                  <span class="service-url">{{ configsByService[service.type]?.url || "Not configured" }}</span>
                </div>
              </div>
              <span class="service-action">{{ configsByService[service.type] ? "Edit" : "Setup" }}</span>
            </button>
          </div>
        </div>

        <div v-else class="modal-body">
          <div class="form-group">
            <label for="service-url">Service URL</label>
            <input id="service-url" :value="configForm.url" type="text" class="form-input" placeholder="http://192.168.1.100:8989" @input="updateField('url', ($event.target as HTMLInputElement).value)" />
          </div>

          <div class="form-group">
            <label for="service-api-key">{{ credentialLabel }}</label>
            <div class="api-key-row">
              <input
                id="service-api-key"
                :value="configForm.apiKey"
                :type="isApiKeyVisible ? 'text' : 'password'"
                class="form-input"
                :placeholder="credentialPlaceholder"
                @input="updateField('apiKey', ($event.target as HTMLInputElement).value)"
              />
              <button class="toggle-btn" type="button" :aria-label="isApiKeyVisible ? 'Hide API key' : 'Show API key'" @click="$emit('toggleApiKey')">
                <Icon :icon="isApiKeyVisible ? 'mdi:eye-off' : 'mdi:eye'" />
              </button>
            </div>
            <p v-if="editingService === 'qbittorrent'" class="field-hint">Use `username:password` for qBittorrent.</p>
            <p v-if="hasStoredCredential" class="field-hint">Leave blank to keep the stored credential.</p>
          </div>

          <label class="checkbox-row">
            <input :checked="configForm.enabled" type="checkbox" @change="updateField('enabled', ($event.target as HTMLInputElement).checked)" />
            <span>Enable this service</span>
          </label>

          <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'" role="status">
            <Icon :icon="testResult.success ? 'mdi:check-circle' : 'mdi:alert-circle'" />
            <span>{{ testResult.message }}</span>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="step === 'form'" class="secondary-btn" @click="$emit('back')">Back</button>
          <button v-if="step === 'form'" class="secondary-btn" :disabled="isTestingConnection" @click="$emit('testConnection')">
            <Icon :icon="isTestingConnection ? 'mdi:loading' : 'mdi:wifi'" :class="{ spin: isTestingConnection }" />
            Test
          </button>
          <button v-if="showDeleteAction" class="danger-btn" :disabled="isDeleting" @click="$emit('deleteConfig')">
            <Icon :icon="isDeleting ? 'mdi:loading' : 'mdi:trash-can-outline'" :class="{ spin: isDeleting }" />
            Delete
          </button>
          <button class="secondary-btn" @click="$emit('close')">Cancel</button>
          <button v-if="step === 'form'" class="primary-btn" :disabled="isSaving" @click="$emit('save')">
            <Icon :icon="isSaving ? 'mdi:loading' : 'mdi:check'" :class="{ spin: isSaving }" />
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import type {
  MediaConfig,
  MediaServiceDefinition,
  MediaServiceType,
  SaveConfigPayload,
  TestConnectionResult,
} from "@/types/media";

const props = defineProps<{
  isOpen: boolean;
  step: "list" | "form";
  services: MediaServiceDefinition[];
  editingService: MediaServiceType;
  configForm: SaveConfigPayload;
  configsByService: Partial<Record<MediaServiceType, MediaConfig>>;
  isApiKeyVisible: boolean;
  testResult: TestConnectionResult | null;
  isSaving: boolean;
  isDeleting: boolean;
  isTestingConnection: boolean;
}>();

const emit = defineEmits<{
  close: [];
  back: [];
  save: [];
  deleteConfig: [];
  toggleApiKey: [];
  testConnection: [];
  editService: [service: MediaServiceType];
  updateField: [field: keyof SaveConfigPayload, value: string | boolean];
}>();

const serviceLabel = computed(() => {
  return props.services.find((service) => service.type === props.editingService)?.name || props.editingService;
});

const credentialLabel = computed(() => {
  return props.editingService === "qbittorrent" ? "Credentials" : "API Key";
});

const credentialPlaceholder = computed(() => {
  if (hasStoredCredential.value) {
    return props.editingService === "qbittorrent" ? "Stored credentials" : "Stored API key";
  }

  return props.editingService === "qbittorrent" ? "admin:password" : "Your API key";
});

const hasStoredCredential = computed(() => {
  return Boolean(props.configsByService[props.editingService]?.hasApiKey);
});

const showDeleteAction = computed(() => {
  return props.step === "form" && Boolean(props.configsByService[props.editingService]?.id);
});

const updateField = (field: keyof SaveConfigPayload, value: string | boolean) => {
  emit("updateField", field, value);
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.isOpen) {
    emit("close");
  }
};

onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => document.removeEventListener("keydown", handleEscape));
</script>

<style scoped>
@reference "../../assets/css/main.css";

.modal-overlay {
  @apply fixed inset-0 z-[60] grid place-items-center bg-[rgba(5,8,12,0.72)] p-4 backdrop-blur-md;
}

.modal-content {
  @apply rounded-[14px] border border-white/8 bg-[#0f1419] shadow-[0_24px_80px_rgba(0,0,0,0.45)];
  width: min(var(--media-modal-width, 560px), 100%);
}

.modal-header,
.modal-footer {
  @apply flex items-center justify-between gap-3 px-[1.1rem] py-4;
}

.modal-header {
  @apply border-b border-white/6;
}

.modal-footer {
  @apply justify-end border-t border-white/6;
}

.modal-subtitle,
.service-url {
  @apply mt-1 text-[0.72rem] text-white/45;
}

.modal-body {
  @apply px-[1.1rem] py-4;
}

.service-list {
  @apply flex flex-col gap-2.5;
}

.service-row,
.secondary-btn,
.primary-btn,
.danger-btn,
.toggle-btn,
.close-btn {
  @apply rounded-[10px] border border-white/8;
}

.service-row {
  @apply flex w-full items-center justify-between gap-4 bg-white/[0.02] px-[0.9rem] py-[0.85rem] text-inherit transition-colors;
}

.service-info {
  @apply flex min-w-0 items-center gap-3;
}

.service-icon {
  @apply text-[1.15rem] text-[#a3c4e8];
}

.service-name {
  @apply block font-semibold text-white/92;
}

.service-action {
  @apply text-xs uppercase tracking-[0.08em] text-[#7fa1c3];
}

.form-group {
  @apply mb-3.5 flex flex-col gap-1.5;
}

.field-hint {
  @apply text-[0.68rem] text-white/45;
}

.form-input {
  @apply w-full rounded-[10px] border border-white/10 bg-white/[0.02] px-[0.8rem] py-3 text-white/90;
}

.api-key-row {
  @apply grid grid-cols-[minmax(0,1fr)_auto] gap-[0.55rem];
}

.checkbox-row {
  @apply mt-1 inline-flex items-center gap-[0.55rem];
}

.test-result {
  @apply mt-4 flex items-center gap-2 rounded-[10px] px-[0.8rem] py-3;
}

.test-result.success {
  @apply bg-[#8bd5a814] text-[#8bd5a8];
}

.test-result.error {
  @apply bg-[#f2b4b414] text-[#f2b4b4];
}

.secondary-btn,
.primary-btn,
.danger-btn,
.toggle-btn,
.close-btn {
  @apply inline-flex cursor-pointer items-center justify-center gap-1.5 bg-[#7fa1c31f] px-[0.85rem] py-[0.6rem] text-[#7fa1c3] transition-colors;
}

.toggle-btn,
.close-btn {
  @apply h-[42px] w-[42px] p-0;
}

.primary-btn {
  @apply bg-[#8bd5a824] text-[#8bd5a8];
}

.danger-btn {
  @apply bg-[#f2b4b424] text-[#f2b4b4];
}

.secondary-btn:disabled,
.primary-btn:disabled,
.danger-btn:disabled {
  @apply cursor-not-allowed opacity-60;
}

.service-row:hover,
.secondary-btn:hover,
.primary-btn:hover,
.danger-btn:hover,
.toggle-btn:hover,
.close-btn:hover {
  @apply border-[#7fa1c34d];
}

.form-input:focus-visible,
.service-row:focus-visible,
.secondary-btn:focus-visible,
.primary-btn:focus-visible,
.danger-btn:focus-visible,
.toggle-btn:focus-visible,
.close-btn:focus-visible {
  outline: 2px solid rgba(127, 161, 195, 0.5);
  outline-offset: 2px;
}

.spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
