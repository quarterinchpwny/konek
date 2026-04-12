import { defineStore } from "pinia";
import axios from "axios";
import { useSshStore } from "./SSHStore";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const useDockerStore = defineStore("docker", {
  state: () => ({
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    async performAction(containerId: string, action: "start" | "stop" | "restart") {
      const sshStore = useSshStore();
      if (!sshStore.sessionId) {
        this.error = "No active SSH session.";
        return;
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await axios.post(
          `${API_URL}/docker/${containerId}/${action}?sessionId=${sshStore.sessionId}`
        );
        return response.data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error(`Error during ${action} for container ${containerId}:`, e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async getLogs(containerId: string, tail: number = 300) {
      const sshStore = useSshStore();
      if (!sshStore.sessionId) {
        this.error = "No active SSH session.";
        return null;
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await axios.get(
          `${API_URL}/docker/${containerId}/logs?sessionId=${sshStore.sessionId}&tail=${tail}`
        );
        return response.data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error(`Error fetching logs for container ${containerId}:`, e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
