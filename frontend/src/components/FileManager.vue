<template>
  <div
    class="file-manager"
    @contextmenu.prevent="handleContextMenu($event, null)"
  >
    <!-- Background layers -->
    <div class="fm-bg"></div>
    <div class="fm-noise"></div>

    <!-- Header Bar -->
    <div class="fm-header">
      <!-- Row 1: Navigation + Path -->
      <div class="fm-header-row">
        <button
          @click="goUp"
          class="fm-btn shrink-0"
          title="Go up one directory"
        >
          <ArrowUturnLeftIcon class="w-4 h-4" />
        </button>

        <div class="fm-path">
          {{ sshStore.currentPath }}
        </div>

        <!-- Actions (always visible) -->
        <div class="fm-actions">
          <button @click="openUploadModal" class="fm-btn" title="Upload files">
            <ArrowUpTrayIcon class="w-4 h-4" />
          </button>
          <button
            v-if="selectedFiles.length > 0"
            @click="promptDelete"
            class="fm-btn fm-btn-danger"
            title="Delete selected"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
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
      </div>

      <!-- Row 2: Search (full width) -->
      <div class="fm-search">
        <MagnifyingGlassIcon class="w-4 h-4 text-white/30 shrink-0" />
        <input v-model="searchQuery" placeholder="Search files…" />
      </div>
    </div>

    <!-- File List Container -->
    <div class="fm-content">
      <!-- Column headers — hidden on mobile -->
      <div class="fm-list-header">
        <div class="fm-col-checkbox">
          <input type="checkbox" v-model="allSelected" class="fm-checkbox" />
        </div>
        <div class="fm-col-name">Name</div>
        <div class="fm-col-size">Size</div>
        <div class="fm-col-permissions">Permissions</div>
      </div>

      <div class="fm-list">
        <div v-if="filteredFiles.length === 0" class="fm-empty">
          <DocumentIcon class="w-8 h-8 opacity-20 mb-2" />
          <span>{{ searchQuery ? "No results" : "Directory is empty" }}</span>
        </div>

        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="handleNavigate(file)"
          @contextmenu.stop.prevent="handleContextMenu($event, file)"
          :class="['fm-row', { 'fm-row-selected': isSelected(file) }]"
        >
          <!-- Checkbox -->
          <div class="fm-col-checkbox">
            <input
              type="checkbox"
              v-model="selectedFiles"
              :value="file"
              @click.stop
              class="fm-checkbox"
            />
          </div>

          <!-- Name -->
          <div class="fm-col-name">
            <FolderIcon
              v-if="file.isDirectory"
              class="fm-icon fm-icon-folder"
            />
            <DocumentIcon v-else class="fm-icon fm-icon-file" />
            <div class="flex flex-col min-w-0">
              <span
                :class="[
                  'truncate',
                  file.isDirectory ? 'fm-name-dir' : 'fm-name-file',
                ]"
              >
                {{ file.name }}
              </span>
              <!-- Mobile: show size + permissions inline under name -->
              <span class="fm-row-meta"
                >{{ file.size }} · {{ file.permissions }}</span
              >
            </div>
          </div>

          <!-- These hide on mobile via CSS, shown via fm-row-meta above -->
          <div class="fm-col-size">{{ file.size }}</div>
          <div class="fm-col-permissions">{{ file.permissions }}</div>
        </div>
      </div>

      <!-- Selection status bar -->
      <Transition name="status-bar">
        <div v-if="selectedFiles.length > 0" class="fm-status-bar">
          <span>{{ selectedFiles.length }} selected</span>
          <div class="flex gap-2">
            <button @click="promptArchive(selectedFiles)" class="fm-status-btn">
              <ArchiveBoxIcon class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Zip</span>
            </button>
            <button
              @click="promptDelete"
              class="fm-status-btn fm-status-btn-danger"
            >
              <TrashIcon class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="contextMenu.show = false"
    />

    <!-- Toast notification -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div v-if="toast.show" :class="['fm-toast', `fm-toast-${toast.type}`]">
          <svg
            v-if="toast.type === 'success'"
            class="fm-toast-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <svg
            v-else
            class="fm-toast-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Teleported Modals ── All rendered directly under <body> to escape
         the parent stacking context created by .content-wrapper z-index: 2 -->

    <!-- Editor Modal (Monaco) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEditor" class="fm-modal-overlay" @click="closeEditor">
          <div class="fm-modal fm-modal-large" @click.stop>
            <div class="fm-modal-header">
              <span class="fm-modal-title truncate max-w-xs">{{
                currentFileName
              }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="copyToClipboard"
                  class="fm-modal-btn"
                  title="Copy to clipboard"
                >
                  <ClipboardIcon class="w-4 h-4" />
                  <span class="hidden sm:inline">Copy</span>
                </button>
                <button
                  v-if="!isReadOnly"
                  @click="saveFile"
                  class="fm-modal-btn fm-modal-btn-primary"
                  title="Save"
                >
                  <Check :size="16" />
                  <span class="hidden sm:inline">Save</span>
                </button>
                <button @click="closeEditor" class="fm-modal-close">
                  <X :size="20" />
                </button>
              </div>
            </div>
            <div class="fm-monaco-container" ref="editorContainer"></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Media Viewer Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showMediaViewer"
          class="fm-modal-overlay"
          @click="showMediaViewer = false"
        >
          <div class="fm-modal fm-modal-media" @click.stop>
            <div class="fm-modal-header">
              <span class="fm-modal-title truncate max-w-[60vw]">{{
                currentMediaName
              }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-white/40">
                  {{ currentMediaIndex + 1 }} / {{ mediaFiles.length }}
                </span>
                <button @click="showMediaViewer = false" class="fm-modal-close">
                  <X :size="20" />
                </button>
              </div>
            </div>
            <div class="fm-media-container group">
              <button
                v-if="mediaFiles.length > 1"
                @click="prevMedia"
                class="fm-media-nav fm-media-nav-prev"
              >
                <ChevronLeft :size="28" />
              </button>
              <img
                v-if="mediaViewerType === 'image'"
                :src="mediaViewerSrc"
                class="fm-media zoom-in"
                :class="{ 'fm-media-zoomed': isZoomed }"
                @click="toggleZoom"
              />
              <video
                v-if="mediaViewerType === 'video'"
                :src="mediaViewerSrc"
                controls
                autoplay
                class="fm-media"
              />
              <audio
                v-if="mediaViewerType === 'audio'"
                :src="mediaViewerSrc"
                controls
                autoplay
                class="fm-audio"
              />
              <button
                v-if="mediaFiles.length > 1"
                @click="nextMedia"
                class="fm-media-nav fm-media-nav-next"
              >
                <ChevronRight :size="28" />
              </button>
            </div>
            <div class="fm-media-footer">
              <button
                v-if="mediaViewerType === 'image'"
                @click="toggleZoom"
                class="fm-btn-icon"
              >
                <MagnifyingGlassIcon v-if="!isZoomed" class="w-5 h-5" />
                <MinusIcon v-else class="w-5 h-5" />
              </button>
              <a
                :href="mediaViewerSrc"
                target="_blank"
                download
                class="fm-btn-icon"
              >
                <ArrowDownTrayIcon class="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Generic Input Modal (Rename/Archive) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showInputModal"
          class="fm-modal-overlay"
          @click="closeInputModal"
        >
          <div class="fm-modal fm-modal-small" @click.stop>
            <div class="fm-modal-header">
              <span class="fm-modal-title">{{ inputModalTitle }}</span>
            </div>
            <div class="p-4 sm:p-6">
              <input
                v-model="inputValue"
                class="fm-input w-full"
                :placeholder="inputModalPlaceholder"
                @keyup.enter="handleInputConfirm"
                ref="modalInput"
              />
              <div class="flex justify-end gap-3 mt-5">
                <button @click="closeInputModal" class="fm-btn px-4 w-auto h-9">
                  Cancel
                </button>
                <button
                  @click="handleInputConfirm"
                  class="fm-modal-btn fm-modal-btn-primary px-4"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <ConfirmationDialog
        :show="showConfirmation"
        :title="confirmationTitle"
        :message="confirmationMessage"
        :confirm-text="confirmationText"
        :confirm-button-class="confirmationButtonClass"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </Teleport>

    <!-- Upload Modals -->
    <Teleport to="body">
      <UploadModal
        :show="showUploadModal"
        @close="closeUploadModal"
        @start-upload="startUpload"
      />
      <UploadProgressDialog
        :show="showProgressDialog"
        :files="filesToUpload"
        :progress="uploadProgress"
        :error="uploadError"
        @close="closeProgressDialog"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  reactive,
  watch,
} from "vue";
import { useSshStore } from "../stores/SSHStore";
import ConfirmationDialog from "./ConfirmationDialog.vue";
import ContextMenu from "./ContextMenu.vue";
import UploadModal from "./UploadModal.vue";
import UploadProgressDialog from "./UploadProgressDialog.vue";
import {
  FolderIcon,
  DocumentIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/vue/24/outline";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-vue-next";
import * as monaco from "monaco-editor";

const sshStore = useSshStore();
const props = defineProps<{ hostId?: number }>();

type DeleteFailureResult = {
  path: string;
  status: "deleted" | "error";
  error?: string;
};

type DeleteFailureDetails = {
  message: string;
  results: DeleteFailureResult[];
};

type DeleteFailureError = Error & {
  details?: DeleteFailureDetails;
};

// --- UI State ---
const searchQuery = ref("");
const selectedFiles = ref<any[]>([]);
const showEditor = ref(false);
const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// --- Toast ---
const toast = reactive({
  show: false,
  message: "",
  type: "success" as "success" | "error",
});
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const showToast = (message: string, type: "success" | "error" = "success") => {
  if (toastTimer) clearTimeout(toastTimer);
  toast.message = message;
  toast.type = type;
  toast.show = true;
  toastTimer = setTimeout(() => (toast.show = false), 2500);
};

// --- Context Menu ---
const contextMenu = reactive({ show: false, x: 0, y: 0, target: null as any });

// --- Input Modal ---
const showInputModal = ref(false);
const inputModalTitle = ref("");
const inputModalPlaceholder = ref("");
const inputValue = ref("");
const inputModalAction = ref<((val: string) => void) | null>(null);
const modalInput = ref<HTMLInputElement | null>(null);

// --- Media ---
const showMediaViewer = ref(false);
const mediaViewerSrc = ref("");
let mediaViewerObjectUrl: string | null = null;
const mediaViewerType = ref<"image" | "video" | "audio" | null>(null);
const currentMediaName = ref("");
const currentMediaPath = ref("");
const isZoomed = ref(false);
const currentFileName = ref("");
const currentFilePath = ref("");
const isReadOnly = ref(true);

// --- Delete ---
const showConfirmation = ref(false);
const confirmationTitle = ref("");
const confirmationMessage = ref("");
const confirmationText = ref("Confirm");
const confirmationButtonClass = ref("");
const confirmationAction = ref<(() => void | Promise<void>) | null>(null);

// --- Upload ---
const showUploadModal = ref(false);
const showProgressDialog = ref(false);
const filesToUpload = ref<File[]>([]);
const uploadProgress = ref(0);
const uploadError = ref<string | undefined>(undefined);

// --- Computed ---
const filteredFiles = computed(() => {
  if (!searchQuery.value.trim()) return sshStore.files;
  const q = searchQuery.value.toLowerCase().trim();

  return sshStore.files
    .filter((f: any) => {
      const name = f.name.toLowerCase();
      // Direct name match
      if (name.includes(q)) return true;
      // Extension-only search (e.g. ".js", "js", "png")
      const ext = name.includes(".") ? name.split(".").pop() : "";
      if (ext && (q === ext || q === `.${ext}`)) return true;
      // Fuzzy: all query chars appear in order in the name
      let i = 0;
      for (const ch of name) {
        if (ch === q[i]) i++;
        if (i === q.length) return true;
      }
      return false;
    })
    .sort((a: any, b: any) => {
      const q2 = q;
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      // Exact match first
      if (aName === q2) return -1;
      if (bName === q2) return 1;
      // Starts with query next
      if (aName.startsWith(q2) && !bName.startsWith(q2)) return -1;
      if (bName.startsWith(q2) && !aName.startsWith(q2)) return 1;
      // Contains query next
      const aContains = aName.includes(q2);
      const bContains = bName.includes(q2);
      if (aContains && !bContains) return -1;
      if (bContains && !aContains) return 1;
      // Directories before files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (b.isDirectory && !a.isDirectory) return 1;
      return aName.localeCompare(bName);
    });
});

const mediaFiles = computed(() =>
  sshStore.files.filter(
    (f: any) => !f.isDirectory && isMediaFile(f.name).isMedia,
  ),
);
const currentMediaIndex = computed(() =>
  mediaFiles.value.findIndex((f: any) => f.path === currentMediaPath.value),
);

const contextMenuItems = computed(() => {
  const items: any[] = [];
  const target = contextMenu.target;

  if (target) {
    items.push({
      label: "Open",
      icon: FolderIcon,
      action: () => handleNavigate(target),
    });
    items.push({
      label: "Rename",
      icon: PencilIcon,
      action: () => promptRename(target),
    });
    items.push({
      label: "Download",
      icon: ArrowDownTrayIcon,
      action: () => void downloadFile(target),
    });
    if (target.name.endsWith(".zip") || target.name.endsWith(".tar.gz")) {
      items.push({
        label: "Extract Here",
        icon: ArrowRightOnRectangleIcon,
        action: () => unarchive(target),
      });
    }
    items.push({
      label: "Zip Archive",
      icon: ArchiveBoxIcon,
      action: () => promptArchive([target]),
    });
    items.push({
      divider: true,
      label: "Delete",
      icon: TrashIcon,
      action: () => promptDeleteSingle(target),
      danger: true,
    });
  } else {
    items.push({ label: "New Folder", icon: FolderIcon, action: () => {} });
    items.push({
      label: "Refresh",
      icon: ArrowPathIcon,
      action: refreshAndClearSelection,
    });
  }
  return items;
});

// --- Lifecycle ---
onMounted(() => window.addEventListener("keydown", handleGlobalKeydown));
onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  if (editor) editor.dispose();
  if (mediaViewerObjectUrl) {
    URL.revokeObjectURL(mediaViewerObjectUrl);
    mediaViewerObjectUrl = null;
  }
  document.body.style.overflow = "";
});

// --- Methods ---
const handleContextMenu = (e: MouseEvent, file: any) => {
  contextMenu.x = e.clientX;
  contextMenu.y = e.clientY;
  contextMenu.target = file;
  contextMenu.show = true;
};

const handleNavigate = async (file: any) => {
  if (file.isDirectory) {
    await sshStore.listFiles(file.path);
    selectedFiles.value = [];
    searchQuery.value = ""; // clear search when entering a folder
  } else {
    const mediaInfo = isMediaFile(file.name);
    if (mediaInfo.isMedia) void openMediaViewer(file);
    else openFile(file);
  }
};

const openFile = async (file: any) => {
  const content = await sshStore.readFile(file.path);
  currentFileName.value = file.name;
  currentFilePath.value = file.path;
  showEditor.value = true;
  isReadOnly.value = false;

  await nextTick();
  if (editorContainer.value) {
    if (editor) editor.dispose();
    const extension = file.name.split(".").pop()?.toLowerCase();
    editor = monaco.editor.create(editorContainer.value, {
      value: content,
      language: getMonacoLanguage(extension),
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "JetBrains Mono",
      readOnly: isReadOnly.value,
      padding: { top: 16 },
    });
  }
};

const saveFile = async () => {
  if (!editor) return;
  try {
    await sshStore.writeFile(currentFilePath.value, editor.getValue());
    showToast(`Saved ${currentFileName.value}`);
  } catch (e) {
    console.error("Failed to save file", e);
    showToast("Failed to save file", "error");
  }
};

const closeEditor = () => {
  showEditor.value = false;
  if (editor) {
    editor.dispose();
    editor = null;
  }
};

const getMonacoLanguage = (ext?: string) => {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    sh: "shell",
    yml: "yaml",
    yaml: "yaml",
    vue: "html",
  };
  return map[ext || ""] || "plaintext";
};

const promptRename = (file: any) => {
  inputModalTitle.value = `Rename ${file.isDirectory ? "Folder" : "File"}`;
  inputModalPlaceholder.value = "New name…";
  inputValue.value = file.name;
  inputModalAction.value = async (newName) => {
    const newPath = file.path.replace(file.name, newName);
    await sshStore.renameFile(file.path, newPath);
    await refreshAndClearSelection();
  };
  showInputModal.value = true;
  nextTick(() => modalInput.value?.focus());
};

const promptArchive = (files: any[]) => {
  inputModalTitle.value = "Create Zip Archive";
  inputModalPlaceholder.value = "Archive name (without extension)…";
  inputValue.value = "archive";
  inputModalAction.value = async (name) => {
    await sshStore.archiveItems(
      files.map((f) => f.path),
      name,
      "zip",
    );
    await refreshAndClearSelection();
  };
  showInputModal.value = true;
  nextTick(() => modalInput.value?.focus());
};

const unarchive = async (file: any) => {
  await sshStore.unarchiveFile(file.path);
  await refreshAndClearSelection();
};

const setMediaViewerBlob = async (filePath: string) => {
  const blob = await sshStore.fetchFileBlob(filePath);
  if (mediaViewerObjectUrl) {
    URL.revokeObjectURL(mediaViewerObjectUrl);
  }
  mediaViewerObjectUrl = URL.createObjectURL(blob);
  mediaViewerSrc.value = mediaViewerObjectUrl;
};

const downloadFile = async (file: any) => {
  const blob = await sshStore.fetchFileBlob(file.path);
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(objectUrl);
};

const handleInputConfirm = () => {
  if (inputValue.value && inputModalAction.value) {
    inputModalAction.value(inputValue.value);
    closeInputModal();
  }
};

const isMediaFile = (filePath: string) => {
  const img = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];
  const vid = [".mp4", ".webm", ".ogg", ".mov", ".mkv"];
  const aud = [".mp3", ".wav", ".flac", ".aac", ".m4a"];
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  if (img.includes(ext)) return { isMedia: true, mediaType: "image" as const };
  if (vid.includes(ext)) return { isMedia: true, mediaType: "video" as const };
  if (aud.includes(ext)) return { isMedia: true, mediaType: "audio" as const };
  return { isMedia: false, mediaType: null };
};

const openMediaViewer = async (file: any) => {
  const info = isMediaFile(file.name);
  await setMediaViewerBlob(file.path);
  mediaViewerType.value = info.mediaType;
  currentMediaName.value = file.name;
  currentMediaPath.value = file.path;
  showMediaViewer.value = true;
  isZoomed.value = false;
};

const nextMedia = async () => {
  const i = currentMediaIndex.value;
  await openMediaViewer(
    mediaFiles.value[i < mediaFiles.value.length - 1 ? i + 1 : 0],
  );
};

const prevMedia = async () => {
  const i = currentMediaIndex.value;
  await openMediaViewer(
    mediaFiles.value[i > 0 ? i - 1 : mediaFiles.value.length - 1],
  );
};

const toggleZoom = () => (isZoomed.value = !isZoomed.value);

const goUp = async () => {
  const parts = sshStore.currentPath.split("/").filter(Boolean);
  parts.pop();
  await sshStore.listFiles("/" + parts.join("/"));
  selectedFiles.value = [];
  searchQuery.value = "";
};

const refreshAndClearSelection = async () => {
  await sshStore.listFiles(sshStore.currentPath);
  selectedFiles.value = [];
};

const allSelected = computed({
  get: () =>
    sshStore.files.length > 0 &&
    selectedFiles.value.length === sshStore.files.length,
  set: (val) => (selectedFiles.value = val ? [...sshStore.files] : []),
});

const isSelected = (file: any) =>
  selectedFiles.value.some((f) => f.path === file.path);

const promptDelete = () => {
  confirmationTitle.value = "Confirm Deletion";
  confirmationMessage.value = `Delete ${selectedFiles.value.length} item${selectedFiles.value.length === 1 ? "" : "s"}?`;
  confirmationAction.value = async () => {
    try {
      const response = await sshStore.deleteFiles(
        selectedFiles.value.map((f) => ({
          path: f.path,
          type: f.isDirectory ? "directory" : "file",
        })),
      );
      if (!response) {
        throw new Error("No session");
      }
      showToast(response.message);
    } catch (error) {
      console.error("Failed to delete files", error);
      showToast(getDeleteFailureMessage(error), "error");
    } finally {
      await refreshAndClearSelection();
    }
  };
  showConfirmation.value = true;
};

const promptDeleteSingle = (file: any) => {
  selectedFiles.value = [file];
  promptDelete();
};

const getDeleteFailureMessage = (error: unknown) => {
  const details = (error as DeleteFailureError | undefined)?.details;
  const failedResult = details?.results.find((result) => result.status === "error");
  if (failedResult?.error) {
    return `${details?.message ?? "Delete failed."} ${failedResult.path}: ${failedResult.error}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Delete failed.";
};

const handleConfirm = async () => {
  const action = confirmationAction.value;
  showConfirmation.value = false;
  if (!action) return;
  await action();
};
const handleCancel = () => (showConfirmation.value = false);

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (showMediaViewer.value) {
    if (e.key === "ArrowRight") void nextMedia();
    if (e.key === "ArrowLeft") void prevMedia();
    if (e.key === "Escape") showMediaViewer.value = false;
  }
  if (showInputModal.value && e.key === "Escape") closeInputModal();
  if (showEditor.value) {
    if (e.key === "Escape") closeEditor();
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveFile();
    }
  }
};

const copyToClipboard = () => {
  if (editor) navigator.clipboard.writeText(editor.getValue());
};

const openUploadModal = () => (showUploadModal.value = true);
const closeUploadModal = () => {
  showUploadModal.value = false;
};

const closeInputModal = () => {
  showInputModal.value = false;
  inputValue.value = "";
  inputModalAction.value = null;
};

const startUpload = async (files: File[]) => {
  showUploadModal.value = false;
  filesToUpload.value = files;
  uploadProgress.value = 0;
  uploadError.value = undefined;
  showProgressDialog.value = true;
  try {
    await sshStore.uploadFiles(sshStore.currentPath, files, (p: any) => {
      uploadProgress.value = Math.round((p.loaded * 100) / (p.total ?? 1));
    });
  } catch (e: any) {
    uploadError.value = e.message;
  }
};

const closeProgressDialog = () => {
  showProgressDialog.value = false;
  filesToUpload.value = [];
  uploadProgress.value = 0;
  uploadError.value = undefined;
  refreshAndClearSelection();
};

const hasOpenModal = computed(
  () =>
    showEditor.value ||
    showMediaViewer.value ||
    showInputModal.value ||
    showConfirmation.value ||
    showUploadModal.value ||
    showProgressDialog.value,
);

watch(hasOpenModal, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
});

watch(showMediaViewer, (isOpen) => {
  if (!isOpen && mediaViewerObjectUrl) {
    URL.revokeObjectURL(mediaViewerObjectUrl);
    mediaViewerObjectUrl = null;
    mediaViewerSrc.value = "";
  }
});
</script>

<style scoped>
@reference "../assets/css/main.css";

.file-manager {
  @apply relative flex h-full w-full flex-col overflow-hidden;
  font-family: "Outfit", sans-serif;
}

.fm-bg {
  @apply absolute inset-0 z-0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
}

.fm-noise {
  @apply pointer-events-none absolute inset-0 z-[1];
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

.fm-header {
  @apply relative z-[2] flex shrink-0 flex-col gap-2 border-b border-white/6 bg-[rgba(20,25,32,0.6)] px-4 py-3 sm:px-5 sm:py-3.5;
}

.fm-header-row {
  @apply flex items-center gap-2;
}

.fm-path {
  @apply flex-1 truncate rounded-lg border border-white/6 bg-[rgba(10,14,18,0.6)] px-3 py-2 text-xs text-white/70 sm:px-4 sm:py-2.5 sm:text-[0.8125rem];
  font-family: "JetBrains Mono", monospace;
}

.fm-actions {
  @apply flex shrink-0 items-center gap-1.5;
}

.fm-search {
  @apply flex w-full items-center gap-2.5 rounded-lg border border-white/6 bg-[rgba(10,14,18,0.4)] px-3.5 transition-colors;
}

.fm-search:focus-within {
  @apply border-[#7fa1c34d];
}

.fm-search input {
  @apply flex-1 border-0 bg-transparent py-2 text-[0.8125rem] text-white outline-none;
  font-family: inherit;
}

.fm-search input::placeholder {
  @apply text-white/30;
}

.fm-btn {
  @apply flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/6 bg-[rgba(30,35,42,0.6)] text-white/60 transition-all;
}

.fm-btn:hover {
  @apply bg-[rgba(40,45,52,0.8)] text-white;
  transform: translateY(-1px);
}

.fm-btn-danger {
  @apply border-red-400/20 bg-red-400/10 text-red-400;
}

.fm-content {
  @apply relative z-[2] flex flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5 sm:py-4;
}

.fm-list-header {
  @apply hidden shrink-0;
}

@media (min-width: 640px) {
  .fm-list-header {
    @apply grid items-center gap-3 rounded-t-lg border border-white/6 bg-[rgba(20,25,32,0.4)] px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-white/40;
    grid-template-columns: 40px 1fr 90px 120px;
  }
}

@media (min-width: 640px) and (max-width: 767px) {
  .fm-list-header {
    grid-template-columns: 40px 1fr 90px;
  }

  .fm-list-header .fm-col-permissions {
    @apply hidden;
  }
}

.fm-list {
  @apply flex-1 overflow-y-auto rounded-lg border border-white/6 bg-[rgba(20,25,32,0.3)];
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 640px) {
  .fm-list {
    @apply rounded-b-lg rounded-t-none border-t-0;
  }
}

.fm-empty {
  @apply flex h-full min-h-40 flex-col items-center justify-center gap-1 text-sm text-white/30;
}

.fm-row {
  @apply grid cursor-pointer grid-cols-1 items-center border-b border-white/[0.03] px-4 py-3 transition-colors;
}

.fm-row .fm-col-checkbox,
.fm-row .fm-col-size,
.fm-row .fm-col-permissions {
  @apply hidden;
}

.fm-row-meta {
  @apply mt-0.5 text-[0.6875rem] text-white/30;
  font-family: "JetBrains Mono", monospace;
}

@media (min-width: 640px) {
  .fm-row {
    @apply gap-3;
    grid-template-columns: 40px 1fr 90px;
  }

  .fm-row .fm-col-checkbox {
    @apply flex items-center;
  }

  .fm-row .fm-col-size {
    @apply block;
  }

  .fm-row-meta {
    @apply hidden;
  }
}

@media (min-width: 768px) {
  .fm-row {
    grid-template-columns: 40px 1fr 90px 120px;
  }

  .fm-row .fm-col-permissions {
    @apply block;
  }
}

.fm-row:last-child {
  @apply border-b-0;
}

.fm-row:hover {
  @apply bg-[rgba(30,35,42,0.5)];
}

.fm-row-selected {
  @apply bg-[#6b8cae1f];
}

.fm-row-selected:hover {
  @apply bg-[#6b8cae2e];
}

.fm-col-name {
  @apply flex min-w-0 items-center gap-2.5;
}

.fm-icon {
  @apply h-[18px] w-[18px] shrink-0;
}

.fm-icon-folder {
  @apply text-[#e8c368];
}

.fm-icon-file {
  @apply text-[#7fa1c3];
}

.fm-name-dir {
  @apply text-sm font-semibold text-white;
}

.fm-name-file {
  @apply text-sm text-white/80;
}

.fm-col-size,
.fm-col-permissions {
  @apply text-xs text-white/40;
  font-family: "JetBrains Mono", monospace;
}

.fm-checkbox {
  @apply h-4 w-4 cursor-pointer;
  accent-color: #7fa1c3;
}

.fm-status-bar {
  @apply mt-2 flex shrink-0 items-center justify-between rounded-lg border border-[#7fa1c333] bg-[#7fa1c314] px-4 py-2 text-[0.8125rem] text-white/70;
}

.fm-status-btn {
  @apply flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/70 transition-all;
  font-family: inherit;
}

.fm-status-btn:hover {
  @apply bg-white/10 text-white;
}

.fm-status-btn-danger {
  @apply border-red-400/20 bg-red-400/8 text-red-400;
}

.fm-status-btn-danger:hover {
  @apply bg-red-400/15;
}

.status-bar-enter-active,
.status-bar-leave-active {
  transition: all 0.2s ease;
}

.status-bar-enter-from,
.status-bar-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.fm-modal-overlay {
  @apply fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 p-0;
  backdrop-filter: blur(8px);
}

@media (min-width: 640px) {
  .fm-modal-overlay {
    @apply items-center p-6;
  }
}

.fm-modal {
  @apply relative flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.5)];
}

@media (min-width: 640px) {
  .fm-modal {
    @apply max-w-[800px] max-h-none rounded-2xl;
  }
}

.fm-modal-large {
  @apply h-[92vh];
}

@media (min-width: 640px) {
  .fm-modal-large {
    @apply h-[85vh] max-w-[90vw];
  }
}

@media (min-width: 640px) {
  .fm-modal-small {
    @apply max-w-[420px];
  }
}

.fm-modal-media {
  @apply h-[92vh] bg-black;
}

@media (min-width: 640px) {
  .fm-modal-media {
    @apply h-auto max-h-[90vh] max-w-[90vw];
  }
}

.fm-modal-header {
  @apply flex shrink-0 items-center justify-between gap-3 border-b border-white/6 bg-[#161b22] px-5 py-4 sm:px-6 sm:py-5;
}

.fm-modal-title {
  @apply text-[0.9375rem] font-semibold text-white;
}

.fm-modal-close {
  @apply flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/8 bg-white/5 text-white/60 transition-all;
}

.fm-modal-close:hover {
  @apply bg-white/10 text-white;
}

.fm-monaco-container {
  @apply min-h-0 w-full flex-1 bg-[#0d1117];
}

.fm-input {
  @apply rounded-lg border border-white/10 bg-[#161b22] px-4 py-3 text-sm text-white outline-none transition-colors;
  font-family: inherit;
}

.fm-input:focus {
  @apply border-[#58a6ff];
}

.fm-modal-btn {
  @apply flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3.5 py-2 text-[0.8125rem] font-semibold text-white transition-all;
  font-family: inherit;
}

.fm-modal-btn-primary {
  @apply border-[#f0f6fc1a] bg-[#238636];
}

.fm-modal-btn-primary:hover {
  @apply bg-[#2ea043];
}

.fm-media-container {
  @apply relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black;
}

.fm-media {
  @apply max-h-full max-w-full object-contain;
}

.fm-media-zoomed {
  @apply max-h-none max-w-none cursor-zoom-out;
}

.zoom-in {
  @apply cursor-zoom-in;
}

.fm-audio {
  @apply w-[80%] max-w-[500px];
}

.fm-media-nav {
  @apply absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 text-white opacity-0 transition-opacity;
}

@media (hover: none) {
  .fm-media-nav {
    @apply opacity-100;
  }
}

.fm-media-container:hover .fm-media-nav {
  @apply opacity-100;
}

.fm-media-nav-prev {
  @apply left-3;
}

.fm-media-nav-next {
  @apply right-3;
}

.fm-media-footer {
  @apply flex shrink-0 items-center justify-center gap-6 bg-[#161b22] p-3.5;
}

.fm-btn-icon {
  @apply flex cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-1 text-white/60 transition-all;
}

.fm-btn-icon:hover {
  @apply text-white;
  transform: scale(1.15);
}

.fm-toast {
  @apply pointer-events-none fixed bottom-6 left-1/2 z-[99999] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.4)];
  font-family: "Outfit", sans-serif;
}

.fm-toast-success {
  @apply border border-green-600/35 bg-green-600/15 text-green-400;
}

.fm-toast-error {
  @apply border border-red-600/35 bg-red-600/15 text-red-400;
}

.fm-toast-icon {
  @apply h-[15px] w-[15px] shrink-0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.95);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.25s ease;
}

.modal-fade-enter-from .fm-modal,
.modal-fade-leave-to .fm-modal {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }

  .modal-fade-enter-from .fm-modal,
  .modal-fade-leave-to .fm-modal {
    transform: scale(0.96);
  }
}
</style>
