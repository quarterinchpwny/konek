import { defineStore } from "pinia";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface Host {
  id?: number;
  alias: string;
  hostname: string;
  port?: number;
  username: string;
  password?: string;
  macAddress?: string; // Add macAddress field
  status?: "online" | "offline" | "checking..." | "error" | "unknown";
  lastChecked?: string | null;
  online?: boolean;
  stats?: {
    cpu: {
      percent: number;
    };
    memory: {
      used: number;
      total: number;
      percent: number;
    };
    disk: {
      mount: string;
      percent: string;
      used: string;
      total: string;
    }[];
  };
  error?: string;
}
interface HostState {
  hosts: Host[];
  isLoading: Boolean;
  error: string | null;
  selectedHost: Host | null
}

export const useHostStore = defineStore("hosts", {
  state: ():HostState => ({
    hosts: [] as Host[],
    isLoading: false,
    error: null as string | null,
    selectedHost: null,
  }),

  getters: {
    hostById: (state) => {
      return (id: number) => state.hosts.find((h) => h.id === id);
    },
    hostCount: (state) => state.hosts.length,
    hasError: (state) => !!state.error,
  },

  actions: {
    async setSelectedHost(host: Host){
      this.selectedHost = host;
    },
    async fetchHosts() {
      this.isLoading = true;
      this.error = null;

      try {
        const { data } = await axios.get(`${API_URL}/hosts`);
        this.hosts = data.map((h: any) => ({
          id: h.id,
          alias: h.alias,
          hostname: h.hostname,
          port: h.port,
          username: h.username,
          macAddress: h.macAddress, // Include macAddress
          status: h.status,
          lastChecked: h.lastChecked,
        }));
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error fetching hosts:", e);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchOnlineStatus(id: number | string) {
      this.error = null;

      try {
        const { data } = await axios.get(`${API_URL}/check-online/${id}`);
        return data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error fetching status:", e);
        throw e;
      }
    },

    async addHost(hostData: Host) {
      this.isLoading = true;
      this.error = null;

      try {
        const { data } = await axios.post(`${API_URL}/hosts`, hostData);
        this.hosts.push(data);
        return data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error adding host:", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async updateHost(id: number, hostData: Partial<Host>) {
      this.isLoading = true;
      this.error = null;

      try {
        const { data } = await axios.put(`${API_URL}/hosts/${id}`, hostData);

        const index = this.hosts.findIndex((h) => h.id === id);
        if (index !== -1) {
          this.hosts[index] = {
            ...this.hosts[index],
            ...data,
          };
        }

        return data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error updating host:", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteHost(id: number) {
      this.isLoading = true;
      this.error = null;

      try {
        await axios.delete(`${API_URL}/hosts/${id}`);
        this.hosts = this.hosts.filter((h) => h.id !== id);
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error deleting host:", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async sendWol(id: number) {
      this.error = null;
      try {
        const { data } = await axios.post(`${API_URL}/hosts/${id}/wol`);
        console.log("WOL response:", data);
        return data;
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message;
        console.error("Error sending WOL packet:", e);
        throw e;
      }
    },

    async fetchBulkHostStatus() {
      const ids = this.hosts.map((h) => h.id).filter((id) => id) as number[];
      if (ids.length === 0) {
        return;
      }

      try {
        const { data: updatedHosts } = await axios.post(
          `${API_URL}/hosts/check-online/bulk`,
          { ids }
        );

        const updatedHostsMap = new Map(
          updatedHosts.map((h: Host) => [h.id, h])
        );

        this.hosts = this.hosts.map((host) => {
          const updatedHost = updatedHostsMap.get(host.id);
          return updatedHost ? { ...host, ...updatedHost } : host;
        });
      } catch (e: any) {
        console.error("Error fetching bulk host status:", e);
      }
    },
  },
});
