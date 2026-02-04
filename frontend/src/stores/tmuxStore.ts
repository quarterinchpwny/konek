import { defineStore } from "pinia";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface TmuxSession {
  name: string;
}

interface TmuxState {
  sessions: TmuxSession[];
  currentSessionLogs: string;
  isLoading: boolean;
  error: string | null;
  isTmuxInstalled: boolean | null;
}

export const useTmuxStore = defineStore("tmux", {
  state: (): TmuxState => ({
    sessions: [],
    currentSessionLogs: "",
    isLoading: false,
    error: null,
    isTmuxInstalled: null,
  }),

  actions: {
    resetTmuxStatus() {
      this.isTmuxInstalled = null;
      this.sessions = [];
      this.error = null;
      this.currentSessionLogs = "";
    },
    async checkTmux(hostId: number) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/hosts/${hostId}/tmux/sessions/check`);
        this.isTmuxInstalled = response.data.installed;
      } catch (e: any) {
        this.isTmuxInstalled = false; // Assume not installed on error
        this.error = e.response?.data?.message || e.message;
        console.error("Error checking tmux:", e);
      } finally {
        this.isLoading = false;
      }
    },
    async fetchSessions(hostId: number) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/hosts/${hostId}/tmux/sessions`);
        this.sessions = response.data.sessions.map((name: string) => ({ name }));
      } catch (e: any) {
        this.error = e.response?.data?.message || e.message;
        console.error("Error fetching tmux sessions:", e);
      } finally {
        this.isLoading = false;
      }
    },

    async createSession(hostId: number, command: string, sessionName?: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const payload = { command, sessionName };
        const response = await axios.post(`${API_URL}/hosts/${hostId}/tmux/sessions`, payload);
        // Optionally refetch sessions to update the list
        await this.fetchSessions(hostId);
        return response.data;
      } catch (e: any) {
        this.error = e.response?.data?.message || e.message;
        console.error("Error creating tmux session:", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSessionLogs(hostId: number, sessionName: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/hosts/${hostId}/tmux/sessions/${sessionName}/logs`);
        this.currentSessionLogs = response.data.logs;
      } catch (e: any) {
        this.error = e.response?.data?.message || e.message;
        console.error("Error fetching session logs:", e);
      } finally {
        this.isLoading = false;
      }
    },

    async killSession(hostId: number, sessionName: string) {
      this.isLoading = true;
      this.error = null;
      try {
        await axios.delete(`${API_URL}/hosts/${hostId}/tmux/sessions/${sessionName}`);
        // Remove the session from the store directly or refetch
        this.sessions = this.sessions.filter(session => session.name !== sessionName);
        if (this.currentSessionLogs && sessionName === this.currentSessionLogs) { // Clear logs if killed session was being viewed
            this.currentSessionLogs = "";
        }
      } catch (e: any) {
        this.error = e.response?.data?.message || e.message;
        console.error("Error killing tmux session:", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    // Clear logs when no session is selected or logs are no longer relevant
    clearSessionLogs() {
        this.currentSessionLogs = "";
    }
  },
});
