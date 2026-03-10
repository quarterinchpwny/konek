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
  isTestingConnection: boolean;
}>();

const emit = defineEmits<{
  close: [];
  back: [];
  save: [];
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
  return props.editingService === "qbittorrent" ? "admin:password" : "Your API key";
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
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(5, 8, 12, 0.72);
  backdrop-filter: blur(10px);
}

.modal-content {
  width: min(var(--media-modal-width, 560px), 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: #0f1419;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}

.modal-header, .modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
}

.modal-header { border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.modal-footer { border-top: 1px solid rgba(255, 255, 255, 0.06); justify-content: flex-end; }
.modal-subtitle, .service-url { margin: 0.25rem 0 0; color: rgba(255, 255, 255, 0.45); font-size: 0.72rem; }
.modal-body { padding: 1rem 1.1rem; }
.service-list { display: flex; flex-direction: column; gap: 0.6rem; }
.service-row, .secondary-btn, .primary-btn, .toggle-btn, .close-btn { border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; }
.service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.85rem 0.9rem;
  background: rgba(255, 255, 255, 0.02);
  color: inherit;
  cursor: pointer;
}

.service-info { display: flex; align-items: center; gap: 0.8rem; min-width: 0; }
.service-icon { font-size: 1.15rem; color: #a3c4e8; }
.service-name { display: block; color: rgba(255, 255, 255, 0.92); font-weight: 600; }
.service-action { color: #7fa1c3; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.9rem; }
.field-hint { margin: 0; color: rgba(255, 255, 255, 0.45); font-size: 0.68rem; }
.form-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.9);
  padding: 0.75rem 0.8rem;
}

.api-key-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.55rem; }
.checkbox-row { display: inline-flex; align-items: center; gap: 0.55rem; margin-top: 0.25rem; }
.test-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 0.8rem;
  border-radius: 10px;
}

.test-result.success { background: rgba(139, 213, 168, 0.08); color: #8bd5a8; }
.test-result.error { background: rgba(242, 180, 180, 0.08); color: #f2b4b4; }
.secondary-btn, .primary-btn, .toggle-btn, .close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: rgba(127, 161, 195, 0.12);
  color: #7fa1c3;
  padding: 0.6rem 0.85rem;
  cursor: pointer;
}

.toggle-btn, .close-btn { width: 42px; height: 42px; padding: 0; }
.primary-btn { background: rgba(139, 213, 168, 0.14); color: #8bd5a8; }
.secondary-btn:disabled, .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.service-row:hover, .secondary-btn:hover, .primary-btn:hover, .toggle-btn:hover, .close-btn:hover { border-color: rgba(127, 161, 195, 0.3); }
.form-input:focus-visible, .service-row:focus-visible, .secondary-btn:focus-visible, .primary-btn:focus-visible, .toggle-btn:focus-visible, .close-btn:focus-visible {
  outline: 2px solid rgba(127, 161, 195, 0.5);
  outline-offset: 2px;
}

.spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
