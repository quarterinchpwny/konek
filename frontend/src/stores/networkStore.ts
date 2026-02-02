import { defineStore } from "pinia";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface PortNode {
    id: string;
    name: string;
    type: 'port';
}

export interface ServiceNode {
    id: string;
    name: string;
    type: 'service';
    image: string;
    state: string;
}

export interface PortGroupNode {
    id: string;
    name: string;
    type: 'port-group';
    children: PortNode[];
}

export interface ServiceGroupNode {
    id: string;
    name: string;
    type: 'service-group';
    children: ServiceNode[];
}

export interface HostNode {
    id: string;
    name: string;
    type: 'host';
    children: Array<ServiceGroupNode | PortGroupNode>;
}

interface NetworkState {
    topology: HostNode[];
    isLoading: boolean;
    error: string | null;
    lastFetched: Date | null;
}

export const useNetworkStore = defineStore("network", {
    state: (): NetworkState => ({
        topology: [] as HostNode[],
        isLoading: false,
        error: null as string | null,
        lastFetched: null as Date | null,
    }),

    getters: {
        // Get total number of hosts
        hostCount: (state) => state.topology.length,

        // Get total number of containers across all hosts
        totalContainers: (state) => {
            let count = 0;
            state.topology.forEach(host => {
                host.children?.forEach(group => {
                    if (group.type === 'service-group') {
                        count += group.children?.length || 0;
                    }
                });
            });
            return count;
        },

        // Get total number of open ports across all hosts
        totalPorts: (state) => {
            let count = 0;
            state.topology.forEach(host => {
                host.children?.forEach(group => {
                    if (group.type === 'port-group') {
                        count += group.children?.length || 0;
                    }
                });
            });
            return count;
        },

        // Get running containers count
        runningContainers: (state) => {
            let count = 0;
            state.topology.forEach(host => {
                host.children?.forEach(group => {
                    if (group.type === 'service-group') {
                        group.children?.forEach(service => {
                            if (service.state?.toLowerCase().includes('running') ||
                                service.state?.toLowerCase().includes('up')) {
                                count++;
                            }
                        });
                    }
                });
            });
            return count;
        },

        // Get host by ID
        hostById: (state) => {
            return (id: string) => state.topology.find((h) => h.id === id);
        },

        // Get all containers for a specific host
        containersByHost: (state) => {
            return (hostId: string) => {
                const host = state.topology.find(h => h.id === hostId);
                if (!host) return [];

                const serviceGroup = host.children?.find(
                    group => group.type === 'service-group'
                ) as ServiceGroupNode | undefined;

                return serviceGroup?.children || [];
            };
        },

        // Get all ports for a specific host
        portsByHost: (state) => {
            return (hostId: string) => {
                const host = state.topology.find(h => h.id === hostId);
                if (!host) return [];

                const portGroup = host.children?.find(
                    group => group.type === 'port-group'
                ) as PortGroupNode | undefined;

                return portGroup?.children || [];
            };
        },

        // Check if data is stale (older than 30 seconds)
        isStale: (state) => {
            if (!state.lastFetched) return true;
            const thirtySecondsAgo = new Date(Date.now() - 30000);
            return state.lastFetched < thirtySecondsAgo;
        },

        // Check if there's an error
        hasError: (state) => !!state.error,
    },

    actions: {
        /**
         * Fetch network topology from the API
         */
        async fetchTopology() {
            this.isLoading = true;
            this.error = null;

            try {
                const { data } = await axios.get<HostNode[]>(`${API_URL}/network`);
                this.topology = data;
                this.lastFetched = new Date();
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || e.message;
                console.error("Error fetching network topology:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Refresh topology data (force fetch)
         */
        async refreshTopology() {
            return this.fetchTopology();
        },

        /**
         * Get topology data, fetch if stale
         */
        async getTopology() {
            if (this.topology.length === 0 || this.isStale) {
                await this.fetchTopology();
            }
            return this.topology;
        },

        /**
         * Find a specific service/container by ID across all hosts
         */
        findServiceById(serviceId: string): ServiceNode | null {
            for (const host of this.topology) {
                for (const group of host.children) {
                    if (group.type === 'service-group') {
                        const service = group.children.find(s => s.id === serviceId);
                        if (service) return service;
                    }
                }
            }
            return null;
        },

        /**
         * Find a specific port by ID across all hosts
         */
        findPortById(portId: string): PortNode | null {
            for (const host of this.topology) {
                for (const group of host.children) {
                    if (group.type === 'port-group') {
                        const port = group.children.find(p => p.id === portId);
                        if (port) return port;
                    }
                }
            }
            return null;
        },

        /**
         * Get statistics for a specific host
         */
        getHostStats(hostId: string) {
            const host = this.topology.find(h => h.id === hostId);
            if (!host) return null;

            let containerCount = 0;
            let runningCount = 0;
            let portCount = 0;

            host.children?.forEach(group => {
                if (group.type === 'service-group') {
                    containerCount = group.children?.length || 0;
                    group.children?.forEach(service => {
                        if (service.state?.toLowerCase().includes('running') ||
                            service.state?.toLowerCase().includes('up')) {
                            runningCount++;
                        }
                    });
                } else if (group.type === 'port-group') {
                    portCount = group.children?.length || 0;
                }
            });

            return {
                containerCount,
                runningCount,
                portCount,
            };
        },

        /**
         * Clear error state
         */
        clearError() {
            this.error = null;
        },

        /**
         * Reset store to initial state
         */
        reset() {
            this.topology = [];
            this.isLoading = false;
            this.error = null;
            this.lastFetched = null;
        },
    },
});