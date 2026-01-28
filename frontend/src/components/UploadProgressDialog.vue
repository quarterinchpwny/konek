<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-100">Uploading...</h3>
        <p class="mt-2 text-sm text-gray-400">{{ files.length }} file(s) in progress.</p>
        <div class="mt-4">
          <div class="w-full bg-gray-700 rounded-full h-2.5">
            <div
              class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <div class="text-right text-xs text-gray-400 mt-1">{{ Math.round(progress) }}%</div>
        </div>
        <div v-if="error" class="mt-3 text-sm text-red-400 bg-red-900/20 p-3 rounded">
          <strong>Error:</strong> {{ error }}
        </div>
      </div>
      <div v-if="progress === 100 && !error" class="p-6 text-center text-green-400">
        Upload Complete!
      </div>
      <div class="bg-gray-700/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
        <button
          @click="$emit('close')"
          :disabled="progress > 0 && progress < 100 && !error"
          class="px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  files: {
    type: Array as () => File[],
    required: true,
  },
  progress: {
    type: Number,
    required: true,
  },
  error: {
    type: String,
    default: null,
  }
});

defineEmits(['close']);
</script>
