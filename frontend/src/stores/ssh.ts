import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;
console.log('SSH Store API_URL:', API_URL);

export const useSshStore = defineStore('ssh', () => {
  const sessionId = ref<string | null>(localStorage.getItem('sessionId'));
  const currentPath = ref('/');
  const files = ref<any[]>([]);
  const isConnected = ref(false);
  const isLoading = ref(false);

  // Actions
  async function connect(hostId: number) {
    isLoading.value = true;
    try {
      const res = await axios.post(`${API_URL}/connect`, { hostId });
      if (res.data.status === 'success') {
        sessionId.value = res.data.sessionId;
        localStorage.setItem('sessionId', res.data.sessionId);
        isConnected.value = true;
        await listFiles('/'); // Load root on connect
      }
    } catch (e) {
      console.error('Connection failed', e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function listFiles(path: string) {
    if (!sessionId.value) return;
    isLoading.value = true;
    try {
      const res = await axios.get(`${API_URL}/files/list`, {
        params: { sessionId: sessionId.value, path }
      });
      files.value = res.data.files;
      currentPath.value = res.data.path;
    } catch (e) {
      console.error('List files error', e);
    } finally {
      isLoading.value = false;
    }
  }

  async function readFile(path: string) {
    const res = await axios.get(`${API_URL}/files/read`, {
        params: { sessionId: sessionId.value, path }
    });
    return res.data.content;
  }

  return { 
    sessionId, 
    currentPath, 
    files, 
    isConnected, 
    isLoading, 
    connect, 
    listFiles,
    readFile 
  };
});