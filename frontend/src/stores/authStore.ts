import { defineStore } from "pinia";
import axios from "axios";

import { getAuthToken, setAuthToken } from "../services/api";

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    token: getAuthToken(),
    isAuthenticated: false,
    isReady: false,
    isLoading: false,
    error: null,
  }),

  actions: {
    async initialize() {
      if (!this.token) {
        this.isReady = true;
        this.isAuthenticated = false;
        return;
      }

      this.isLoading = true;
      try {
        await axios.get(`${API_URL}/auth/session`);
        this.isAuthenticated = true;
      } catch {
        setAuthToken(null);
        this.token = null;
        this.isAuthenticated = false;
      } finally {
        this.isLoading = false;
        this.isReady = true;
      }
    },

    async login(password: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const { data } = await axios.post(`${API_URL}/auth/login`, { password });
        this.token = data.token;
        this.isAuthenticated = true;
        setAuthToken(data.token);
      } catch (error: any) {
        this.error = error.response?.data?.message || "Login failed";
        this.isAuthenticated = false;
        throw error;
      } finally {
        this.isLoading = false;
        this.isReady = true;
      }
    },

    async logout() {
      try {
        if (this.token) {
          await axios.post(`${API_URL}/auth/logout`);
        }
      } catch {
        undefined;
      } finally {
        this.token = null;
        this.isAuthenticated = false;
        this.error = null;
        setAuthToken(null);
        localStorage.removeItem("sessionId");
      }
    },
  },
});
