import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const useSshStore = defineStore('ssh', {

  state: () => ({
    sessionId: localStorage.getItem('sessionId') as string | null,
    currentPath: '/',
    files: [] as any[],
    isConnected: false,
    isLoading: false,
  }),

  getters: {
    hasSession: (state) => !!state.sessionId,
    fileCount: (state) => state.files.length,
    fileURL: (state) => {
      return (path: string) => {
        if (!state.sessionId) return '';
        return `${API_URL}/files/view?sessionId=${state.sessionId}&path=${encodeURIComponent(
          path
        )}`;
      };
    },
  },

  actions: {
    async connect(hostId: number) {
      this.isLoading = true;
      try {
        const res = await axios.post(`${API_URL}/connect`, { hostId });

        if (res.data.status === 'success') {
          this.sessionId = res.data.sessionId;
          localStorage.setItem('sessionId', res.data.sessionId);
          this.isConnected = true;

          // Load root directory after connect
          await this.listFiles('/');
        }
      } catch (e) {
        console.error('Connection failed', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async listFiles(path: string) {
      if (!this.sessionId) return;

      this.isLoading = true;
      try {
        const res = await axios.get(`${API_URL}/files/list`, {
          params: {
            sessionId: this.sessionId,
            path,
          },
        });

        this.files = res.data.files;
        this.currentPath = res.data.path;
      } catch (e) {
        console.error('List files error', e);
      } finally {
        this.isLoading = false;
      }
    },

    async readFile(path: string) {
      if (!this.sessionId) return '';

      const res = await axios.get(`${API_URL}/files/read`, {
        params: {
          sessionId: this.sessionId,
          path,
        },
      });

      return res.data.content;
    },

    async uploadFiles(path: string, filesToUpload: File[]) {
      if (!this.sessionId) return;

      this.isLoading = true;
      try {
        const formData = new FormData();
        formData.append('sessionId', this.sessionId);
        formData.append('path', path);

        filesToUpload.forEach((file) => {
          formData.append('files', file);
        });

        await axios.post(`${API_URL}/files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } catch (e) {
        console.error('Upload files error', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteFiles(
      items: { path: string; type: 'file' | 'directory' }[]
    ) {
      if (!this.sessionId) return;

      this.isLoading = true;
      try {
        await axios.post(`${API_URL}/files/delete`, {
          sessionId: this.sessionId,
          items,
        });
      } catch (e) {
        console.error('Delete files error', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    disconnect() {
      this.sessionId = null;
      this.isConnected = false;
      this.files = [];
      this.currentPath = '/';
      localStorage.removeItem('sessionId');
    },
  },
});
