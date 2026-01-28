<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
      <div class="p-6 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-gray-100">Upload Files</h3>
      </div>
      <div class="p-6">
        <div
          @dragenter.prevent="onDragEnter"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
          :class="{ 'border-blue-500 bg-gray-700/50': isDragging }"
          class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer transition-colors"
          @click="triggerFileInput"
        >
          <input type="file" ref="fileInput" @change="onFileSelect" multiple class="hidden" />
          <div class="flex flex-col items-center">
            <ArrowUpTrayIcon class="w-12 h-12 text-gray-500" />
            <p class="mt-4 text-sm text-gray-400">
              <span class="font-semibold text-blue-400">Click to select files</span> or drag and drop
            </p>
          </div>
        </div>
        <div v-if="files.length" class="mt-4 max-h-48 overflow-y-auto">
          <ul>
            <li v-for="(file, index) in files" :key="index" class="text-sm text-gray-300 py-1 flex justify-between items-center">
              <span>{{ file.name }}</span>
              <button @click="removeFile(index)" class="text-red-400 hover:text-red-300">
                &times;
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="bg-gray-700/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
        <button
          @click="$emit('close')"
          class="px-4 py-2 rounded text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none"
        >
          Cancel
        </button>
        <button
          @click="startUpload"
          :disabled="files.length === 0"
          class="px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Start Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowUpTrayIcon } from '@heroicons/vue/24/outline';

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'start-upload']);

const files = ref<File[]>([]);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const handleFiles = (fileList: FileList) => {
  for (const file of Array.from(fileList)) {
    files.value.push(file);
  }
};

const onDragEnter = () => { isDragging.value = true; };
const onDragOver = () => { isDragging.value = true; };
const onDragLeave = () => { isDragging.value = false; };
const onDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    handleFiles(event.dataTransfer.files);
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    handleFiles(target.files);
  }
  target.value = ''; // Reset for next selection
};

const removeFile = (index: number) => {
  files.value.splice(index, 1);
};

const startUpload = () => {
  if (files.value.length > 0) {
    emit('start-upload', files.value);
    files.value = []; // Clear after emitting
  }
};
</script>
