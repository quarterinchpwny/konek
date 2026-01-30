<template>
  <div class="file-manager">
    <!-- Background layers -->
    <div class="fm-bg"></div>
    <div class="fm-noise"></div>

    <!-- Header Bar -->
    <div class="fm-header">
      <button @click="goUp" class="fm-btn" title="Go up one directory">
        <ArrowUturnLeftIcon class="w-4 h-4" />
      </button>
      
      <div class="fm-path">
        {{ sshStore.currentPath }}
      </div>

      <!-- Upload Button -->
      <button
        @click="openUploadModal"
        class="fm-btn"
        title="Upload files"
      >
        <ArrowUpTrayIcon class="w-4 h-4" />
      </button>

      <!-- Delete Button -->
      <button
        v-if="selectedFiles.length > 0"
        @click="promptDelete"
        class="fm-btn fm-btn-danger"
        title="Delete selected"
      >
        <TrashIcon class="w-4 h-4" />
      </button>

      <!-- Refresh Button -->
      <button
        @click="refreshAndClearSelection"
        class="fm-btn"
        title="Refresh"
      >
        <ArrowPathIcon
          class="w-4 h-4"
          :class="{ 'animate-spin': sshStore.isLoading }"
        />
      </button>
    </div>

    <!-- File List Container -->
    <div class="fm-content">
      <!-- Header Row -->
      <div class="fm-list-header">
        <div class="fm-col-checkbox">
          <input
            type="checkbox"
            v-model="allSelected"
            class="fm-checkbox"
          />
        </div>
        <div class="fm-col-name">Name</div>
        <div class="fm-col-size">Size</div>
        <div class="fm-col-permissions">Permissions</div>
      </div>

      <!-- File Rows -->
      <div class="fm-list">
        <div
          v-for="file in sshStore.files"
          :key="file.path"
          @click="handleNavigate(file)"
          :class="['fm-row', { 'fm-row-selected': isSelected(file) }]"
        >
          <div class="fm-col-checkbox">
            <input
              type="checkbox"
              v-model="selectedFiles"
              :value="file"
              @click.stop
              class="fm-checkbox"
            />
          </div>
          
          <div class="fm-col-name">
            <FolderIcon
              v-if="file.isDirectory"
              class="fm-icon fm-icon-folder"
            />
            <DocumentIcon
              v-else
              class="fm-icon fm-icon-file"
            />
            <span :class="[file.isDirectory ? 'fm-name-dir' : 'fm-name-file']">
              {{ file.name }}
            </span>
          </div>
          
          <div class="fm-col-size">{{ file.size }}</div>
          
          <div class="fm-col-permissions">{{ file.permissions }}</div>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showEditor"
        class="fm-modal-overlay"
        @click="showEditor = false"
      >
        <div class="fm-modal" @click.stop>
          <div class="fm-modal-header">
            <span class="fm-modal-title">Editor</span>
            <button
              @click="showEditor = false"
              class="fm-modal-close"
            >
              <X :size="20" />
            </button>
          </div>
          <textarea
            v-model="editorContent"
            class="fm-editor"
            placeholder="File content..."
          ></textarea>
        </div>
      </div>
    </Transition>

    <!-- Media Viewer Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showMediaViewer"
        class="fm-modal-overlay"
        @click="showMediaViewer = false"
      >
        <div class="fm-modal fm-modal-media" @click.stop>
          <div class="fm-modal-header">
            <span class="fm-modal-title">Media Viewer</span>
            <button
              @click="showMediaViewer = false"
              class="fm-modal-close"
            >
              <X :size="20" />
            </button>
          </div>
          <div class="fm-media-container">
            <img
              v-if="mediaViewerType === 'image'"
              :src="mediaViewerSrc"
              class="fm-media"
              alt="Media preview"
            />
            <video
              v-if="mediaViewerType === 'video'"
              :src="mediaViewerSrc"
              controls
              class="fm-media"
            ></video>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation -->
    <ConfirmationDialog
      :show="showConfirmation"
      :title="confirmationTitle"
      :message="confirmationMessage"
      :confirm-text="confirmationText"
      :confirm-button-class="confirmationButtonClass"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />

    <!-- Upload Modals -->
    <UploadModal
      :show="showUploadModal"
      @close="showUploadModal = false"
      @start-upload="startUpload"
    />
    <UploadProgressDialog
      :show="showProgressDialog"
      :files="filesToUpload"
      :progress="uploadProgress"
      :error="uploadError"
      @close="closeProgressDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useSshStore } from "../stores/SSHStore";
import ConfirmationDialog from "./ConfirmationDialog.vue";
import UploadModal from "./UploadModal.vue";
import UploadProgressDialog from "./UploadProgressDialog.vue";
import {
  FolderIcon,
  DocumentIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import { X } from "lucide-vue-next";

const sshStore = useSshStore();

// UI State
const editorContent = ref("");
const showEditor = ref(false);
const selectedFiles = ref<any[]>([]);
const showMediaViewer = ref(false);
const mediaViewerSrc = ref("");
const mediaViewerType = ref<"image" | "video" | null>(null);

// --- Delete Confirmation State ---
const showConfirmation = ref(false);
const confirmationTitle = ref("");
const confirmationMessage = ref("");
const confirmationText = ref("Confirm");
const confirmationButtonClass = ref("");
const confirmationAction = ref<(() => void) | null>(null);

// --- Upload State ---
const showUploadModal = ref(false);
const showProgressDialog = ref(false);
const filesToUpload = ref<File[]>([]);
const uploadProgress = ref(0);
const uploadError = ref<string | null>(null);

// --- Generic File/Folder Logic ---
const isMediaFile = (
  filePath: string,
): { isMedia: boolean; mediaType: "image" | "video" | null } => {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];
  const videoExtensions = [".mp4", ".webm", ".ogg"];
  const extIndex = filePath.lastIndexOf(".");
  const ext = extIndex > 0 ? filePath.substring(extIndex).toLowerCase() : "";

  if (imageExtensions.includes(ext)) return { isMedia: true, mediaType: "image" };
  if (videoExtensions.includes(ext)) return { isMedia: true, mediaType: "video" };
  return { isMedia: false, mediaType: null };
};

const openMediaViewer = (path: string, type: "image" | "video" | null) => {
  mediaViewerSrc.value = sshStore.fileURL(path);
  mediaViewerType.value = type;
  showMediaViewer.value = true;
};

const allSelected = computed({
  get: () => sshStore.files?.length > 0 && selectedFiles.value.length === sshStore.files.length,
  set: (value: boolean) => {
    selectedFiles.value = value ? [...sshStore.files] : [];
  },
});

const isSelected = (file: any) => selectedFiles.value.some((f) => f.path === file.path);

const handleNavigate = async (file: any) => {
  if (file.isDirectory) {
    await sshStore.listFiles(file.path);
    selectedFiles.value = [];
  } else {
    const mediaInfo = isMediaFile(file.name);
    if (mediaInfo.isMedia) {
      openMediaViewer(file.path, mediaInfo.mediaType);
    } else {
      openFile(file.path);
    }
  }
};

const goUp = async () => {
  const parts = sshStore.currentPath.split("/").filter(Boolean);
  parts.pop();
  const parentPath = "/" + parts.join("/");
  await sshStore.listFiles(parentPath);
  selectedFiles.value = [];
};

const openFile = async (path: string) => {
  const content = await sshStore.readFile(path);
  editorContent.value = content;
  showEditor.value = true;
};

const refreshAndClearSelection = async () => {
  await sshStore.listFiles(sshStore.currentPath);
  selectedFiles.value = [];
};

// --- Delete Logic ---
const handleConfirm = () => {
  confirmationAction.value?.();
  showConfirmation.value = false;
};

const handleCancel = () => {
  showConfirmation.value = false;
};

const promptDelete = () => {
  if (selectedFiles.value.length === 0) return;

  confirmationTitle.value = "Confirm Deletion";
  confirmationMessage.value = `Are you sure you want to delete ${selectedFiles.value.length} item(s)? This action cannot be undone.`;
  confirmationText.value = "Delete";
  confirmationButtonClass.value = "bg-red-600 hover:bg-red-700";

  confirmationAction.value = async () => {
    const itemsToDelete = selectedFiles.value.map((file) => ({
      path: String(file.path),
      type: (file.isDirectory ? "directory" : "file") as "file" | "directory",
    }));
    await sshStore.deleteFiles(itemsToDelete);
    await refreshAndClearSelection();
  };

  showConfirmation.value = true;
};

// --- Upload Logic ---
const openUploadModal = () => {
  showUploadModal.value = true;
};

const startUpload = async (files: File[]) => {
  showUploadModal.value = false;
  filesToUpload.value = files;
  showProgressDialog.value = true;
  uploadProgress.value = 0;
  uploadError.value = null;

  try {
    await sshStore.uploadFiles(
      sshStore.currentPath,
      files,
      (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
        );
        uploadProgress.value = percentCompleted;
      }
    );
  } catch (e: any) {
    uploadError.value = e.message || "An unknown error occurred.";
  }
};

const closeProgressDialog = () => {
  showProgressDialog.value = false;
  refreshAndClearSelection();
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

.file-manager {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Background layers */
.fm-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  z-index: 0;
}

.fm-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Header */
.fm-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(20, 25, 32, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-path {
  flex: 1;
  padding: 0.625rem 1rem;
  background: rgba(10, 14, 18, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8125rem;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(30, 35, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.fm-btn:hover {
  background: rgba(40, 45, 52, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.fm-btn-danger {
  background: rgba(214, 93, 93, 0.15);
  border-color: rgba(214, 93, 93, 0.3);
  color: #d68a8a;
}

.fm-btn-danger:hover {
  background: rgba(214, 93, 93, 0.25);
  border-color: rgba(214, 93, 93, 0.5);
  color: #e39999;
}

/* Content area */
.fm-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1rem 1.5rem;
}

/* List header */
.fm-list-header {
  display: grid;
  grid-template-columns: 40px 1fr 120px 140px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(20, 25, 32, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px 8px 0 0;
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}

/* File list */
.fm-list {
  flex: 1;
  overflow-y: auto;
  background: rgba(20, 25, 32, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.fm-list::-webkit-scrollbar {
  width: 8px;
}

.fm-list::-webkit-scrollbar-track {
  background: rgba(10, 14, 18, 0.4);
}

.fm-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.fm-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* File row */
.fm-row {
  display: grid;
  grid-template-columns: 40px 1fr 120px 140px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.15s ease;
}

.fm-row:hover {
  background: rgba(30, 35, 42, 0.5);
}

.fm-row:last-child {
  border-bottom: none;
}

.fm-row-selected {
  background: rgba(107, 140, 174, 0.12);
  border-color: rgba(107, 140, 174, 0.2);
}

.fm-row-selected:hover {
  background: rgba(107, 140, 174, 0.18);
}

/* Columns */
.fm-col-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.fm-checkbox {
  width: 16px;
  height: 16px;
  background: rgba(30, 35, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fm-checkbox:checked {
  background: #7fa1c3;
  border-color: #7fa1c3;
}

.fm-checkbox:checked::after {
  content: '✓';
  color: #ffffff;
  font-size: 0.625rem;
  font-weight: 700;
}

.fm-col-name {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.fm-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.fm-icon-folder {
  color: #e8c368;
}

.fm-icon-file {
  color: #7fa1c3;
}

.fm-name-dir {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-name-file {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-col-size {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8125rem;
  font-family: 'JetBrains Mono', monospace;
}

.fm-col-permissions {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

/* Modal overlay */
.fm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
}

/* Modal */
.fm-modal {
  position: relative;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  background: #16161a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fm-modal-media {
  max-width: 90vw;
  max-height: 90vh;
}

.fm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: rgba(20, 25, 32, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fm-modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.fm-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fm-modal-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

/* Editor */
.fm-editor {
  flex: 1;
  padding: 1.5rem;
  background: #0a0e12;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.fm-editor::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

/* Media container */
.fm-media-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #0a0e12;
  overflow: hidden;
}

.fm-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* Modal animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .fm-modal,
.modal-fade-leave-active .fm-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .fm-modal,
.modal-fade-leave-to .fm-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>