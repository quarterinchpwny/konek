<template>
  <div class="file-manager" @contextmenu.prevent="handleContextMenu($event, null)">
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

      <!-- Search Bar -->
      <div class="fm-search">
        <MagnifyingGlassIcon class="w-4 h-4 text-white/30" />
        <input v-model="searchQuery" placeholder="Search in this folder..." />
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 ml-4">
        <button @click="openUploadModal" class="fm-btn" title="Upload files">
          <ArrowUpTrayIcon class="w-4 h-4" />
        </button>
        <button v-if="selectedFiles.length > 0" @click="promptDelete" class="fm-btn fm-btn-danger" title="Delete selected">
          <TrashIcon class="w-4 h-4" />
        </button>
        <button @click="refreshAndClearSelection" class="fm-btn" title="Refresh">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': sshStore.isLoading }" />
        </button>
      </div>
    </div>

    <!-- File List Container -->
    <div class="fm-content">
      <div class="fm-list-header">
        <div class="fm-col-checkbox">
          <input type="checkbox" v-model="allSelected" class="fm-checkbox" />
        </div>
        <div class="fm-col-name">Name</div>
        <div class="fm-col-size">Size</div>
        <div class="fm-col-permissions">Permissions</div>
      </div>

      <div class="fm-list">
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="handleNavigate(file)"
          @contextmenu.stop.prevent="handleContextMenu($event, file)"
          :class="['fm-row', { 'fm-row-selected': isSelected(file) }]"
        >
          <div class="fm-col-checkbox">
            <input type="checkbox" v-model="selectedFiles" :value="file" @click.stop class="fm-checkbox" />
          </div>
          <div class="fm-col-name">
            <FolderIcon v-if="file.isDirectory" class="fm-icon fm-icon-folder" />
            <DocumentIcon v-else class="fm-icon fm-icon-file" />
            <span :class="[file.isDirectory ? 'fm-name-dir' : 'fm-name-file']">{{ file.name }}</span>
          </div>
          <div class="fm-col-size">{{ file.size }}</div>
          <div class="fm-col-permissions">{{ file.permissions }}</div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="contextMenu.show = false"
    />

    <!-- Editor Modal (Monaco) -->
    <Transition name="modal-fade">
      <div v-if="showEditor" class="fm-modal-overlay" @click="closeEditor">
        <div class="fm-modal fm-modal-large" @click.stop>
          <div class="fm-modal-header">
            <span class="fm-modal-title">{{ currentFileName }}</span>
            <div class="flex items-center gap-2">
              <button @click="copyToClipboard" class="fm-modal-btn" title="Copy to clipboard">
                <ClipboardIcon class="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button v-if="!isReadOnly" @click="saveFile" class="fm-modal-btn fm-modal-btn-primary" title="Save">
                <Check :size="16" />
                <span>Save</span>
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

    <!-- Media Viewer Modal -->
    <Transition name="modal-fade">
      <div v-if="showMediaViewer" class="fm-modal-overlay" @click="showMediaViewer = false">
        <div class="fm-modal fm-modal-media" @click.stop>
          <div class="fm-modal-header">
            <span class="fm-modal-title">{{ currentMediaName }}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/40 mr-4">{{ currentMediaIndex + 1 }} / {{ mediaFiles.length }}</span>
              <button @click="showMediaViewer = false" class="fm-modal-close">
                <X :size="20" />
              </button>
            </div>
          </div>
          <div class="fm-media-container group">
            <button v-if="mediaFiles.length > 1" @click="prevMedia" class="fm-media-nav fm-media-nav-prev"><ChevronLeft :size="32" /></button>
            <img v-if="mediaViewerType === 'image'" :src="mediaViewerSrc" class="fm-media zoom-in" :class="{ 'fm-media-zoomed': isZoomed }" @click="toggleZoom" />
            <video v-if="mediaViewerType === 'video'" :src="mediaViewerSrc" controls autoplay class="fm-media"></video>
            <audio v-if="mediaViewerType === 'audio'" :src="mediaViewerSrc" controls autoplay class="fm-audio"></audio>
            <button v-if="mediaFiles.length > 1" @click="nextMedia" class="fm-media-nav fm-media-nav-next"><ChevronRight :size="32" /></button>
          </div>
          <div class="fm-media-footer">
            <button @click="toggleZoom" v-if="mediaViewerType === 'image'" class="fm-btn-icon">
              <MagnifyingGlassIcon v-if="!isZoomed" class="w-5 h-5" />
              <MinusIcon v-else class="w-5 h-5" />
            </button>
            <a :href="mediaViewerSrc" target="_blank" download class="fm-btn-icon"><ArrowDownTrayIcon class="w-5 h-5" /></a>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Generic Input Modal (Rename/Archive) -->
    <Transition name="modal-fade">
      <div v-if="showInputModal" class="fm-modal-overlay" @click="showInputModal = false">
        <div class="fm-modal fm-modal-small" @click.stop>
          <div class="fm-modal-header">
            <span class="fm-modal-title">{{ inputModalTitle }}</span>
          </div>
          <div class="p-6">
            <input v-model="inputValue" class="fm-input w-full" :placeholder="inputModalPlaceholder" @keyup.enter="handleInputConfirm" ref="modalInput" />
            <div class="flex justify-end gap-3 mt-6">
              <button @click="showInputModal = false" class="fm-btn px-4 w-auto">Cancel</button>
              <button @click="handleInputConfirm" class="fm-modal-btn fm-modal-btn-primary px-4">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation -->
    <ConfirmationDialog :show="showConfirmation" :title="confirmationTitle" :message="confirmationMessage" :confirm-text="confirmationText" :confirm-button-class="confirmationButtonClass" @confirm="handleConfirm" @cancel="handleCancel" />

    <!-- Upload Modals -->
    <UploadModal :show="showUploadModal" @close="showUploadModal = false" @start-upload="startUpload" />
    <UploadProgressDialog :show="showProgressDialog" :files="filesToUpload" :progress="uploadProgress" :error="uploadError" @close="closeProgressDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from "vue";
import { useSshStore } from "../stores/SSHStore";
import ConfirmationDialog from "./ConfirmationDialog.vue";
import ContextMenu from "./ContextMenu.vue";
import UploadModal from "./UploadModal.vue";
import UploadProgressDialog from "./UploadProgressDialog.vue";
import {
  FolderIcon, DocumentIcon, ArrowPathIcon, ArrowUturnLeftIcon, ArrowUpTrayIcon,
  TrashIcon, MagnifyingGlassIcon, MinusIcon, ArrowDownTrayIcon, ClipboardIcon,
  PencilIcon, ArchiveBoxIcon, ArrowRightOnRectangleIcon
} from "@heroicons/vue/24/outline";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-vue-next";
import * as monaco from 'monaco-editor';

const sshStore = useSshStore();
const props = defineProps<{ hostId?: number }>();

// --- UI State ---
const searchQuery = ref("");
const selectedFiles = ref<any[]>([]);
const showEditor = ref(false);
const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// --- Context Menu State ---
const contextMenu = reactive({ show: false, x: 0, y: 0, target: null as any });

// --- Input Modal State ---
const showInputModal = ref(false);
const inputModalTitle = ref("");
const inputModalPlaceholder = ref("");
const inputValue = ref("");
const inputModalAction = ref<((val: string) => void) | null>(null);
const modalInput = ref<HTMLInputElement | null>(null);

// --- Media State ---
const showMediaViewer = ref(false);
const mediaViewerSrc = ref("");
const mediaViewerType = ref<"image" | "video" | "audio" | null>(null);
const currentMediaName = ref("");
const currentMediaPath = ref("");
const isZoomed = ref(false);
const currentFileName = ref("");
const currentFilePath = ref("");
const isReadOnly = ref(true);

// --- Delete State ---
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
const uploadError = ref<string | undefined>(undefined);

// --- Computed ---
const filteredFiles = computed(() => {
  if (!searchQuery.value) return sshStore.files;
  const q = searchQuery.value.toLowerCase();
  return sshStore.files.filter(f => f.name.toLowerCase().includes(q));
});

const mediaFiles = computed(() => sshStore.files.filter(f => !f.isDirectory && isMediaFile(f.name).isMedia));
const currentMediaIndex = computed(() => mediaFiles.value.findIndex(f => f.path === currentMediaPath.value));

const contextMenuItems = computed(() => {
  const items = [];
  const target = contextMenu.target;

  if (target) {
    items.push({ label: 'Open', icon: FolderIcon, action: () => handleNavigate(target) });
    items.push({ label: 'Rename', icon: PencilIcon, action: () => promptRename(target) });
    items.push({ label: 'Download', icon: ArrowDownTrayIcon, action: () => downloadFile(target) });
    
    if (target.name.endsWith('.zip') || target.name.endsWith('.tar.gz')) {
      items.push({ label: 'Extract Here', icon: ArrowRightOnRectangleIcon, action: () => unarchive(target) });
    }
    
    items.push({ label: 'Zip Archive', icon: ArchiveBoxIcon, action: () => promptArchive([target]) });
    items.push({ divider: true, label: 'Delete', icon: TrashIcon, action: () => promptDeleteSingle(target), danger: true });
  } else {
    items.push({ label: 'New Folder', icon: FolderIcon, action: () => {} });
    items.push({ label: 'Refresh', icon: ArrowPathIcon, action: refreshAndClearSelection });
  }
  return items;
});

// --- Lifecycle ---
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  if (editor) editor.dispose();
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
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const language = getMonacoLanguage(extension);

    editor = monaco.editor.create(editorContainer.value, {
      value: content,
      language: language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: 'JetBrains Mono',
      readOnly: isReadOnly.value,
      padding: { top: 16 }
    });
  }
};

const saveFile = async () => {
  if (!editor) return;
  const content = editor.getValue();
  try {
    await sshStore.writeFile(currentFilePath.value, content);
    console.log('File saved successfully');
  } catch (e) {
    console.error('Failed to save file', e);
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
    'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'json': 'json',
    'html': 'html', 'css': 'css', 'md': 'markdown', 'sh': 'shell',
    'yml': 'yaml', 'yaml': 'yaml', 'vue': 'html'
  };
  return map[ext || ''] || 'plaintext';
};

const promptRename = (file: any) => {
  inputModalTitle.value = `Rename ${file.isDirectory ? 'Folder' : 'File'}`;
  inputModalPlaceholder.value = 'New name...';
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
  inputModalTitle.value = 'Create Zip Archive';
  inputModalPlaceholder.value = 'Archive name (without extension)...';
  inputValue.value = 'archive';
  inputModalAction.value = async (name) => {
    await sshStore.archiveItems(files.map(f => f.path), name, 'zip');
    await refreshAndClearSelection();
  };
  showInputModal.value = true;
};

const unarchive = async (file: any) => {
  await sshStore.unarchiveFile(file.path);
  await refreshAndClearSelection();
};

const downloadFile = (file: any) => {
  const url = sshStore.fileURL(file.path);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
};

const handleInputConfirm = () => {
  if (inputValue.value && inputModalAction.value) {
    inputModalAction.value(inputValue.value);
    showInputModal.value = false;
  }
};

// --- Standard FM Logic ---
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
  openMediaViewer(mediaFiles.value[i < mediaFiles.value.length - 1 ? i + 1 : 0]);
};

const prevMedia = () => {
  const i = currentMediaIndex.value;
  openMediaViewer(mediaFiles.value[i > 0 ? i - 1 : mediaFiles.value.length - 1]);
};

const toggleZoom = () => isZoomed.value = !isZoomed.value;

const goUp = async () => {
  const parts = sshStore.currentPath.split("/").filter(Boolean);
  parts.pop();
  await sshStore.listFiles("/" + parts.join("/"));
  selectedFiles.value = [];
};

const refreshAndClearSelection = async () => {
  await sshStore.listFiles(sshStore.currentPath);
  selectedFiles.value = [];
};

const allSelected = computed({
  get: () => sshStore.files.length > 0 && selectedFiles.value.length === sshStore.files.length,
  set: (val) => selectedFiles.value = val ? [...sshStore.files] : []
});

const isSelected = (file: any) => selectedFiles.value.some(f => f.path === file.path);

const promptDelete = () => {
  confirmationTitle.value = "Confirm Deletion";
  confirmationMessage.value = `Delete ${selectedFiles.value.length} items?`;
  confirmationAction.value = async () => {
    await sshStore.deleteFiles(selectedFiles.value.map(f => ({ path: f.path, type: f.isDirectory ? 'directory' : 'file' })));
    await refreshAndClearSelection();
  };
  showConfirmation.value = true;
};

const promptDeleteSingle = (file: any) => {
  selectedFiles.value = [file];
  promptDelete();
};

const handleConfirm = () => { confirmationAction.value?.(); showConfirmation.value = false; };
const handleCancel = () => showConfirmation.value = false;

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (showMediaViewer.value) {
    if (e.key === 'ArrowRight') nextMedia();
    if (e.key === 'ArrowLeft') prevMedia();
    if (e.key === 'Escape') showMediaViewer.value = false;
  }
  if (showEditor.value && e.key === 'Escape') closeEditor();
};

const copyToClipboard = () => {
  if (editor) navigator.clipboard.writeText(editor.getValue());
};

const openUploadModal = () => showUploadModal.value = true;
const startUpload = async (files: File[]) => {
  showUploadModal.value = false;
  filesToUpload.value = files;
  showProgressDialog.value = true;
  try {
    await sshStore.uploadFiles(sshStore.currentPath, files, (p: any) => {
      uploadProgress.value = Math.round((p.loaded * 100) / (p.total ?? 1));
    });
  } catch (e: any) { uploadError.value = e.message; }
};
const closeProgressDialog = () => { showProgressDialog.value = false; refreshAndClearSelection(); };
</script>

<style scoped>
.file-manager {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Outfit', sans-serif;
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

.fm-header {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem;
  background: rgba(20, 25, 32, 0.6); border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.fm-path {
  flex: 1; padding: 0.625rem 1rem; background: rgba(10, 14, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px; color: rgba(255, 255, 255, 0.7); font-size: 0.8125rem; font-family: 'JetBrains Mono', monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.fm-search {
  display: flex; align-items: center; gap: 0.75rem; padding: 0 1rem; background: rgba(10, 14, 18, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; width: 240px;
}

.fm-search input {
  background: transparent; border: none; color: white; font-size: 0.8125rem; padding: 0.625rem 0; outline: none; width: 100%;
}

.fm-btn {
  display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;
  background: rgba(30, 35, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;
  color: rgba(255, 255, 255, 0.6); cursor: pointer; transition: all 0.2s ease;
}

.fm-btn:hover { background: rgba(40, 45, 52, 0.8); color: white; transform: translateY(-1px); }
.fm-btn-danger { color: #f87171; background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); }

.fm-content { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 1rem 1.5rem; }

.fm-list-header {
  display: grid; grid-template-columns: 40px 1fr 120px 140px; gap: 1rem; align-items: center; padding: 0.75rem 1rem;
  background: rgba(20, 25, 32, 0.4); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px 8px 0 0;
  font-size: 0.6875rem; font-weight: 700; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; letter-spacing: 0.08em;
}

.fm-list { flex: 1; overflow-y: auto; background: rgba(20, 25, 32, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-top: none; border-radius: 0 0 8px 8px; }

.fm-row {
  display: grid; grid-template-columns: 40px 1fr 120px 140px; gap: 1rem; align-items: center; padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03); cursor: pointer; transition: all 0.15s ease;
}

.fm-row:hover { background: rgba(30, 35, 42, 0.5); }
.fm-row-selected { background: rgba(107, 140, 174, 0.12); }

.fm-col-name { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
.fm-icon { flex-shrink: 0; width: 18px; height: 18px; }
.fm-icon-folder { color: #e8c368; }
.fm-icon-file { color: #7fa1c3; }
.fm-name-dir { color: white; font-weight: 600; font-size: 0.875rem; }
.fm-name-file { color: rgba(255, 255, 255, 0.8); font-size: 0.875rem; }
.fm-col-size, .fm-col-permissions { color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }

.fm-checkbox { width: 16px; height: 16px; cursor: pointer; }

/* Modal */
.fm-modal-overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  padding: 1.5rem; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
}

.fm-modal {
  position: relative; width: 100%; max-width: 800px; background: #0d1117; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; overflow: hidden;
}

.fm-modal-large { max-width: 90vw; height: 85vh; }
.fm-modal-small { max-width: 400px; }

.fm-modal-header {
  display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem;
  background: #161b22; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.fm-modal-title { font-size: 0.9375rem; font-weight: 600; color: white; }

.fm-monaco-container { flex: 1; width: 100%; height: 100%; background: #0d1117; }

.fm-input {
  background: #161b22; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white;
  padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; transition: border-color 0.2s;
}
.fm-input:focus { border-color: #58a6ff; }

.fm-modal-btn {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 6px;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1); color: white;
}

.fm-modal-btn-primary { background: #238636; border-color: rgba(240, 246, 252, 0.1); }
.fm-modal-btn-primary:hover { background: #2ea043; }

/* Media */
.fm-modal-media { max-width: 90vw; max-height: 90vh; background: black; }
.fm-media-container { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; background: black; overflow: hidden; }
.fm-media { max-width: 100%; max-height: 100%; object-fit: contain; }
.fm-media-zoomed { max-width: none; max-height: none; cursor: zoom-out; }
.zoom-in { cursor: zoom-in; }
.fm-audio { width: 80%; max-width: 600px; }

.fm-media-nav {
  position: absolute; top: 50%; transform: translateY(-50%); width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.3);
  color: white; border: none; border-radius: 50%; cursor: pointer; opacity: 0; transition: all 0.2s; z-index: 10;
}
.fm-media-container:hover .fm-media-nav { opacity: 1; }
.fm-media-nav-prev { left: 20px; }
.fm-media-nav-next { right: 20px; }

.fm-media-footer { display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 1rem; background: #161b22; }
.fm-btn-icon { background: transparent; border: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; }
.fm-btn-icon:hover { color: white; transform: scale(1.2); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>
