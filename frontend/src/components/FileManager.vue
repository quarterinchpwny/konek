<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-200 font-mono">
    <div
      v-if="!sshStore.isConnected"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div class="bg-gray-800 p-8 rounded-lg w-96 border border-gray-700">
        <h2 class="text-xl mb-4 font-bold text-white">SSH Connect</h2>
        <input
          v-model="host"
          placeholder="Host IP"
          class="w-full mb-3 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <input
          v-model="username"
          placeholder="Username"
          class="w-full mb-3 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="w-full mb-4 bg-gray-900 p-2 rounded border border-gray-700"
        />
        <button
          @click="handleConnect"
          :disabled="sshStore.isLoading"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"
        >
          {{ sshStore.isLoading ? "Connecting..." : "Connect" }}
        </button>
      </div>
    </div>

    <div
      class="h-14 border-b border-gray-700 flex items-center px-4 bg-gray-800 space-x-4"
    >
      <button @click="goUp" class="p-2 hover:bg-gray-700 rounded text-gray-400">
        <ArrowUturnLeftIcon class="w-5 h-5" />
      </button>
      <div class="flex-1 bg-gray-900 px-3 py-1 rounded text-sm text-gray-300">
        {{ sshStore.currentPath }}
      </div>
      <button
        @click="sshStore.listFiles(sshStore.currentPath)"
        class="p-2 hover:bg-gray-700 rounded"
      >
        <ArrowPathIcon
          class="w-5 h-5"
          :class="{ 'animate-spin': sshStore.isLoading }"
        />
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4">
      <div
        class="grid grid-cols-12 text-sm font-bold text-gray-500 border-b border-gray-700 pb-2 mb-2"
      >
        <div class="col-span-6">Name</div>
        <div class="col-span-2">Size</div>
        <div class="col-span-4">Permissions</div>
      </div>

      <div
        v-for="file in sshStore.files"
        :key="file.path"
        @dblclick="handleNavigate(file)"
        class="grid grid-cols-12 py-2 px-1 hover:bg-gray-800 cursor-pointer rounded select-none items-center"
      >
        <div class="col-span-6 flex items-center space-x-2">
          <FolderIcon v-if="file.isDirectory" class="w-5 h-5 text-yellow-500" />
          <DocumentIcon v-else class="w-5 h-5 text-blue-400" />
          <span :class="file.isDirectory ? 'text-white' : 'text-gray-300'">{{
            file.name
          }}</span>
        </div>
        <div class="col-span-2 text-gray-500">{{ file.size }}</div>
        <div class="col-span-4 text-gray-500 font-mono text-xs">
          {{ file.permissions }}
        </div>
      </div>
    </div>

    <div
      v-if="showEditor"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-40 p-10"
    >
      <div
        class="bg-gray-800 w-full h-full flex flex-col rounded border border-gray-700 shadow-2xl"
      >
        <div class="h-10 bg-gray-700 flex items-center justify-between px-4">
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
          class="flex-1 bg-gray-900 text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none"
        ></textarea>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSshStore } from "../stores/ssh";
import {
  FolderIcon,
  DocumentIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/vue/24/outline";

const sshStore = useSshStore();

// UI State
const showConnectModal = ref(true);
const host = ref("");
const username = ref("");
const password = ref("");
const editorContent = ref("");
const showEditor = ref(false);

const handleConnect = async () => {
  await sshStore.connect({
    host: host.value,
    username: username.value,
    password: password.value,
  });
  showConnectModal.value = false;
};

const handleNavigate = (file: any) => {
  if (file.isDirectory) {
    sshStore.listFiles(file.path);
  } else {
    openFile(file.path);
  }
};

const goUp = () => {
  const parts = sshStore.currentPath.split("/").filter(Boolean);
  parts.pop();
  const parentPath = "/" + parts.join("/");
  sshStore.listFiles(parentPath);
};

const openFile = async (path: string) => {
  const content = await sshStore.readFile(path);
  editorContent.value = content;
  showEditor.value = true;
};
</script>
