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
const confirmationAction = ref<(() => void) | null>(null);

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
      action: () => downloadFile(target),
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
    if (mediaInfo.isMedia) openMediaViewer(file);
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

const downloadFile = (file: any) => {
  const link = document.createElement("a");
  link.href = sshStore.fileURL(file.path);
  link.download = file.name;
  link.click();
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

const openMediaViewer = (file: any) => {
  const info = isMediaFile(file.name);
  mediaViewerSrc.value = sshStore.fileURL(file.path);
  mediaViewerType.value = info.mediaType;
  currentMediaName.value = file.name;
  currentMediaPath.value = file.path;
  showMediaViewer.value = true;
  isZoomed.value = false;
};

const nextMedia = () => {
  const i = currentMediaIndex.value;
  openMediaViewer(
    mediaFiles.value[i < mediaFiles.value.length - 1 ? i + 1 : 0],
  );
};

const prevMedia = () => {
  const i = currentMediaIndex.value;
  openMediaViewer(
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
    await sshStore.deleteFiles(
      selectedFiles.value.map((f) => ({
        path: f.path,
        type: f.isDirectory ? "directory" : "file",
      })),
    );
    await refreshAndClearSelection();
  };
  showConfirmation.value = true;
};

const promptDeleteSingle = (file: any) => {
  selectedFiles.value = [file];
  promptDelete();
};

const handleConfirm = () => {
  confirmationAction.value?.();
  showConfirmation.value = false;
};
const handleCancel = () => (showConfirmation.value = false);

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (showMediaViewer.value) {
    if (e.key === "ArrowRight") nextMedia();
    if (e.key === "ArrowLeft") prevMedia();
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
</script>

<style scoped>
/* ── Base ───────────────────────────────────────────────────────────────────── */

.file-manager {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "Outfit", sans-serif;
}

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

/* ── Header ─────────────────────────────────────────────────────────────────── */

.fm-header {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(20, 25, 32, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .fm-header {
    padding: 0.875rem 1.25rem;
  }
}

.fm-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ── Path bar ────────────────────────────────────────────────────────────────*/

.fm-path {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(10, 14, 18, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 640px) {
  .fm-path {
    font-size: 0.8125rem;
    padding: 0.625rem 1rem;
  }
}

/* ── Actions ─────────────────────────────────────────────────────────────────*/

.fm-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

/* ── Search ──────────────────────────────────────────────────────────────────*/

.fm-search {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 0.875rem;
  background: rgba(10, 14, 18, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  width: 100%;
  transition: border-color 0.2s;
}

.fm-search:focus-within {
  border-color: rgba(127, 161, 195, 0.3);
}

.fm-search input {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 0.8125rem;
  padding: 0.5rem 0;
  outline: none;
  font-family: inherit;
}

.fm-search input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* ── Buttons ─────────────────────────────────────────────────────────────────*/

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
  color: white;
  transform: translateY(-1px);
}

.fm-btn-danger {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.2);
}

/* ── Content area ────────────────────────────────────────────────────────────*/

.fm-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.75rem 1rem;
}

@media (min-width: 640px) {
  .fm-content {
    padding: 1rem 1.25rem;
  }
}

/* ── List header ─────────────────────────────────────────────────────────────*/

.fm-list-header {
  display: none;
}

@media (min-width: 640px) {
  .fm-list-header {
    display: grid;
    grid-template-columns: 40px 1fr 90px 120px;
    gap: 0.75rem;
    align-items: center;
    padding: 0.625rem 1rem;
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
}

@media (min-width: 640px) and (max-width: 767px) {
  .fm-list-header {
    grid-template-columns: 40px 1fr 90px;
  }
  .fm-list-header .fm-col-permissions {
    display: none;
  }
}

/* ── File list ───────────────────────────────────────────────────────────────*/

.fm-list {
  flex: 1;
  overflow-y: auto;
  background: rgba(20, 25, 32, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 640px) {
  .fm-list {
    border-top: none;
    border-radius: 0 0 8px 8px;
  }
}

/* ── Empty state ─────────────────────────────────────────────────────────────*/

.fm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.875rem;
  gap: 0.25rem;
}

/* ── File rows ───────────────────────────────────────────────────────────────*/

.fm-row {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.15s ease;
}

.fm-row .fm-col-checkbox {
  display: none;
}
.fm-row .fm-col-size {
  display: none;
}
.fm-row .fm-col-permissions {
  display: none;
}

.fm-row-meta {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: "JetBrains Mono", monospace;
  margin-top: 0.125rem;
}

@media (min-width: 640px) {
  .fm-row {
    grid-template-columns: 40px 1fr 90px;
    gap: 0.75rem;
  }

  .fm-row .fm-col-checkbox {
    display: flex;
    align-items: center;
  }
  .fm-row .fm-col-size {
    display: block;
  }
  .fm-row-meta {
    display: none;
  }
}

@media (min-width: 768px) {
  .fm-row {
    grid-template-columns: 40px 1fr 90px 120px;
  }
  .fm-row .fm-col-permissions {
    display: block;
  }
}

.fm-row:last-child {
  border-bottom: none;
}
.fm-row:hover {
  background: rgba(30, 35, 42, 0.5);
}
.fm-row-selected {
  background: rgba(107, 140, 174, 0.12);
}
.fm-row-selected:hover {
  background: rgba(107, 140, 174, 0.18);
}

/* ── Row cells ───────────────────────────────────────────────────────────────*/

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
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.fm-name-file {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
}

.fm-col-size,
.fm-col-permissions {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  font-family: "JetBrains Mono", monospace;
}

.fm-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #7fa1c3;
}

/* ── Selection status bar ────────────────────────────────────────────────────*/

.fm-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  background: rgba(127, 161, 195, 0.08);
  border: 1px solid rgba(127, 161, 195, 0.2);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.fm-status-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
}

.fm-status-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.fm-status-btn-danger {
  color: #f87171;
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.2);
}

.fm-status-btn-danger:hover {
  background: rgba(248, 113, 113, 0.15);
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

/* ── Modals ──────────────────────────────────────────────────────────────────
   NOTE: These are teleported to <body>, so they are NOT scoped to .file-manager.
   The z-index: 9999 ensures they always render above the sidebar (z-index: 2)
   and the mobile stats drawer (z-index: 50) in MainPage.vue.
*/

.fm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
}

@media (min-width: 640px) {
  .fm-modal-overlay {
    align-items: center;
    padding: 1.5rem;
  }
}

.fm-modal {
  position: relative;
  width: 100%;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
  max-height: 92vh;
}

@media (min-width: 640px) {
  .fm-modal {
    border-radius: 16px;
    max-width: 800px;
    max-height: none;
  }
}

.fm-modal-large {
  height: 92vh;
}

@media (min-width: 640px) {
  .fm-modal-large {
    max-width: 90vw;
    height: 85vh;
  }
}

@media (min-width: 640px) {
  .fm-modal-small {
    max-width: 420px;
  }
}

.fm-modal-media {
  height: 92vh;
  background: black;
}

@media (min-width: 640px) {
  .fm-modal-media {
    max-width: 90vw;
    max-height: 90vh;
    height: auto;
  }
}

.fm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .fm-modal-header {
    padding: 1.25rem 1.5rem;
  }
}

.fm-modal-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
}

.fm-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.fm-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.fm-monaco-container {
  flex: 1;
  width: 100%;
  min-height: 0;
  background: #0d1117;
}

.fm-input {
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.fm-input:focus {
  border-color: #58a6ff;
}

.fm-modal-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}

.fm-modal-btn-primary {
  background: #238636;
  border-color: rgba(240, 246, 252, 0.1);
}
.fm-modal-btn-primary:hover {
  background: #2ea043;
}

/* ── Media viewer ────────────────────────────────────────────────────────────*/

.fm-media-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
  overflow: hidden;
  min-height: 0;
}

.fm-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.fm-media-zoomed {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}

.zoom-in {
  cursor: zoom-in;
}

.fm-audio {
  width: 80%;
  max-width: 500px;
}

.fm-media-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

@media (hover: none) {
  .fm-media-nav {
    opacity: 1;
  }
}

.fm-media-container:hover .fm-media-nav {
  opacity: 1;
}
.fm-media-nav-prev {
  left: 12px;
}
.fm-media-nav-next {
  right: 12px;
}

.fm-media-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.875rem;
  background: #161b22;
  flex-shrink: 0;
}

.fm-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.fm-btn-icon:hover {
  color: white;
  transform: scale(1.15);
}

/* ── Toast ───────────────────────────────────────────────────────────────────*/

.fm-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: "Outfit", sans-serif;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.fm-toast-success {
  background: rgba(22, 163, 74, 0.15);
  border: 1px solid rgba(22, 163, 74, 0.35);
  color: #4ade80;
}

.fm-toast-error {
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.35);
  color: #f87171;
}

.fm-toast-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
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
