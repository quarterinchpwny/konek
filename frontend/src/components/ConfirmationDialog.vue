<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-100">{{ title }}</h3>
        <p class="mt-2 text-sm text-gray-400">{{ message }}</p>
      </div>
      <div class="bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 rounded text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          class="px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          :class="confirmButtonClass"
        >
          {{ confirmText }}
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
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Confirm",
  },
  confirmButtonClass: {
    type: String,
    default: "bg-blue-600 hover:bg-blue-700",
  },
});

defineEmits(["confirm", "cancel"]);
</script>
