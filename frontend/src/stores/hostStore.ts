import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface Host {
  id?: number;
  alias: string;
  hostname: string;
  port?: number;
  username: string;
  password?: string;
}

export const useHostStore = defineStore("hosts", () => {
  const hosts = ref<Host[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  async function fetchHosts() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_URL}/hosts`);
      hosts.value = response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      console.error("Error fetching hosts:", e);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchOnlineStatus(id: number | string) {
    error.value = null;
    try {
      const response = await axios.get(`${API_URL}/check-online/${id}`);
      // hosts.value = response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      console.error("Error fetching status:", e);
    } finally {
    }
  }

  async function addHost(hostData: Host) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_URL}/hosts`, hostData);
      hosts.value.push(response.data);
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      console.error("Error adding host:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateHost(id: number, hostData: Partial<Host>) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_URL}/hosts/${id}`, hostData);
      const index = hosts.value.findIndex((host) => host.id === id);
      if (index !== -1) {
        hosts.value[index] = { ...hosts.value[index], ...response.data };
      }
      return response.data;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      console.error("Error updating host:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteHost(id: number) {
    isLoading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_URL}/hosts/${id}`);
      hosts.value = hosts.value.filter((host) => host.id !== id);
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      console.error("Error deleting host:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    hosts,
    isLoading,
    error,
    fetchHosts,
    addHost,
    updateHost,
    deleteHost,
    fetchOnlineStatus,
  };
});
