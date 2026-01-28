<template>
  <div class="h-[80vh] flex flex-col bg-gray-900 text-gray-200 font-mono">
    <!-- Header Bar -->
    <div
      class="h-14 border-b border-gray-700 flex items-center px-4 bg-gray-800 space-x-4 flex-shrink-0"
    >
      <button @click="goUp" class="p-2 hover:bg-gray-700 rounded text-gray-400">
        <ArrowUturnLeftIcon class="w-5 h-5" />
      </button>
      <div class="flex-1 bg-gray-900 px-3 py-1 rounded text-sm text-gray-300 truncate">
        {{ sshStore.currentPath }}
      </div>

      <!-- Upload Button -->
      <button
        @click="openUploadModal"
        class="p-2 hover:bg-gray-700 rounded"
        title="Upload files"
      >
        <ArrowUpTrayIcon class="w-5 h-5" />
      </button>

      <!-- Delete Button -->
      <button
        v-if="selectedFiles.length > 0"
        @click="promptDelete"
        class="p-2 bg-red-500 hover:bg-red-600 rounded"
        title="Delete selected"
      >
        <TrashIcon class="w-5 h-5" />
      </button>

      <!-- Refresh Button -->
      <button
        @click="refreshAndClearSelection"
        class="p-2 hover:bg-gray-700 rounded"
      >
        <ArrowPathIcon
          class="w-5 h-5"
          :class="{ 'animate-spin': sshStore.isLoading }"
        />
      </button>
    </div>

    <!-- File List -->
    <div class="flex-1 flex flex-col overflow-hidden p-4">
      <!-- Header Row -->
      <div
        class="grid grid-cols-12 text-sm font-bold text-gray-500 border-b border-gray-700 pb-2 mb-2 items-center flex-shrink-0"
      >
        <div class="col-span-1">
          <input
            type="checkbox"
            v-model="allSelected"
            class="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
          />
        </div>
        <div class="col-span-5">Name</div>
        <div class="col-span-2">Size</div>
        <div class="col-span-4">Permissions</div>
      </div>

      <!-- File Rows -->
      <div class="flex-1 overflow-auto">
        <div
          v-for="file in sshStore.files"
          :key="file.path"
          @click="handleNavigate(file)"
          class="grid grid-cols-12 py-2 px-1 hover:bg-gray-800 cursor-pointer rounded select-none items-center"
          :class="{ 'bg-blue-900/20': isSelected(file) }"
        >
          <div class="col-span-1">
            <input
              type="checkbox"
              v-model="selectedFiles"
              :value="file"
              @click.stop
              class="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
          </div>
          <div class="col-span-5 flex items-center space-x-2 truncate">
            <FolderIcon
              v-if="file.isDirectory"
              class="w-5 h-5 text-yellow-500 flex-shrink-0"
            />
            <DocumentIcon
              v-else
              class="w-5 h-5 text-blue-400 flex-shrink-0"
            />
            <span
              :class="[file.isDirectory ? 'text-white' : 'text-gray-300', 'truncate']"
            >
              {{ file.name }}
            </span>
          </div>
          <div class="col-span-2 text-gray-500 truncate">{{ file.size }}</div>
          <div class="col-span-4 text-gray-500 font-mono text-xs truncate">
            {{ file.permissions }}
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <div
      v-if="showEditor"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-40 p-4 md:p-10"
    >
      <div
        class="bg-gray-800 w-full h-full md:w-3/4 md:h-3/4 flex flex-col rounded border border-gray-700 shadow-2xl"
      >
        <div class="h-10 bg-gray-700 flex items-center justify-between px-4 flex-shrink-0">
          <span>Editor</span>
          <button
            @click="showEditor = false"
            class="text-red-400 hover:text-red-300"
          >
            Close
          </button>
        </div>
        <textarea
          v-model="editorContent"
          class="flex-1 bg-gray-900 text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none w-full"
        ></textarea>
      </div>
    </div>

    <!-- Media Viewer Modal -->
    <div
      v-if="showMediaViewer"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 md:p-10"
      @click="showMediaViewer = false"
    >
      <div
        class="bg-gray-800 max-w-full max-h-full w-auto h-auto flex flex-col rounded border border-gray-700 shadow-2xl"
        @click.stop
      >
        <div
          class="h-10 bg-gray-700 flex items-center justify-between px-4 text-white flex-shrink-0"
        >
          <span>Media Viewer</span>
          <button
            @click="showMediaViewer = false"
            class="text-red-400 hover:text-red-300"
          >
            Close
          </button>
        </div>
        <div
          class="p-4 flex items-center justify-center flex-1"
          style="max-height: calc(100vh - 100px); max-width: calc(100vw - 80px)"
        >
          <img
            v-if="mediaViewerType === 'image'"
            :src="mediaViewerSrc"
            class="max-w-full max-h-full object-contain"
          />
          <video
            v-if="mediaViewerType === 'video'"
            :src="mediaViewerSrc"
            controls
            class="max-w-full max-h-full"
          ></video>
        </div>
      </div>
    </div>

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
