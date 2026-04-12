import { defineStore } from 'pinia';
import axios from 'axios';
import { fetchAuthorizedBlob } from '../services/api';

const API_URL = import.meta.env.VITE_API_BASE_URL;

type DeleteFilesResult = {
  path: string;
  status: 'deleted' | 'error';
  error?: string;
};

type DeleteFilesResponse = {
  status: 'success' | 'partial' | 'error';
  message: string;
  results: DeleteFilesResult[];
  deletedCount: number;
  failedCount: number;
};

type DeleteFilesError = Error & {
  details?: DeleteFilesResponse;
};

const createDeleteFilesError = (details: DeleteFilesResponse) => {
  const error = new Error(details.message) as DeleteFilesError;
  error.details = details;
  return error;
};

export const useSshStore = defineStore('ssh', {

  state: () => {
    const sessionId = localStorage.getItem('sessionId');
    return {
      sessionId: sessionId as string | null,
      currentPath: '/',
      files: [] as any[],
      isConnected: !!sessionId,
      isLoading: false,
    };
  },

  getters: {
    hasSession: (state) => !!state.sessionId,
    fileCount: (state) => state.files.length,
  },

  actions: {
    async connect(hostId: number) {
      this.isLoading = true;
      try {
        const res = await axios.post(`${API_URL}/terminal/connect`, { hostId });

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

    async validateSession() {
      if (!this.sessionId) return false;
      try {
        const res = await axios.get(`${API_URL}/terminal/validate`, {
          params: { sessionId: this.sessionId }
        });
        if (res.data.status === 'success') {
          this.isConnected = true;
          return true;
        }
      } catch (e) {
        console.error('Session validation failed', e);
      }
      this.disconnect();
      return false;
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

    async fetchFileBlob(path: string) {
      if (!this.sessionId) {
        throw new Error('No session');
      }

      return await fetchAuthorizedBlob(
        `${API_URL}/files/view?sessionId=${this.sessionId}&path=${encodeURIComponent(path)}`
      );
    },

    async writeFile(path: string, content: string) {
      if (!this.sessionId) return;
      await axios.post(`${API_URL}/files/write`, {
        sessionId: this.sessionId,
        path,
        content
      });
    },

    async uploadFiles(
      path: string,
      filesToUpload: File[],
      onUploadProgress: (progressEvent: any) => void
    ) {
      if (!this.sessionId) return;

      try {
        const formData = new FormData();
        formData.append('sessionId', this.sessionId);
        formData.append('path', path);

        filesToUpload.forEach((file) => {
          formData.append('files', file);
        });

        const res = await axios.post(`${API_URL}/files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress,
        });
        return res.data;
      } catch (e) {
        console.error('Upload files error', e);
        throw e;
      }
    },

    async deleteFiles(
      items: { path: string; type: 'file' | 'directory' }[]
    ) {
      if (!this.sessionId) return;

      this.isLoading = true;
      try {
        const response = await axios.post<DeleteFilesResponse>(`${API_URL}/files/delete`, {
          sessionId: this.sessionId,
          items,
        });
        if (response.data.status !== 'success') {
          throw createDeleteFilesError(response.data);
        }
        return response.data;
      } catch (e) {
        if (axios.isAxiosError<DeleteFilesResponse>(e) && e.response?.data) {
          const deleteError = createDeleteFilesError(e.response.data);
          console.error('Delete files error', deleteError);
          throw deleteError;
        }
        console.error('Delete files error', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async renameFile(oldPath: string, newPath: string) {
      if (!this.sessionId) return;
      await axios.post(`${API_URL}/files/rename`, {
        sessionId: this.sessionId,
        oldPath,
        newPath
      });
    },

    async archiveItems(items: string[], archiveName: string, format: 'zip' | 'tar') {
      if (!this.sessionId) return;
      await axios.post(`${API_URL}/files/archive`, {
        sessionId: this.sessionId,
        items,
        archiveName,
        format
      });
    },

    async unarchiveFile(archivePath: string) {
      if (!this.sessionId) return;
      await axios.post(`${API_URL}/files/unarchive`, {
        sessionId: this.sessionId,
        archivePath
      });
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
