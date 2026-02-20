<template>
  <div class="network-map">
    <!-- Background layers -->
    <div class="background-layer"></div>
    <div class="noise-overlay"></div>
    <div class="grid-overlay"></div>

    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-card">
        <div class="pulse-loader">
          <div class="pulse-ring"></div>
          <div class="pulse-ring"></div>
          <div class="pulse-ring"></div>
        </div>
        <p class="loading-text">Scanning network topology...</p>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="main-content">
      <!-- Header -->
      <div class="header">
        <div class="header-title">
          <Icon icon="mdi:lan" class="title-icon" />
          <div>
            <h1 class="title">Network Map</h1>
            <p class="subtitle">Visualize your infrastructure topology and services</p>
          </div>
        </div>

        <div class="header-actions">
          <button @click="refreshNetwork" class="refresh-btn" :disabled="isRefreshing">
            <Icon icon="mdi:refresh" :class="{ spinning: isRefreshing }" class="btn-icon" />
            <span>Refresh</span>
          </button>

          <div class="view-toggle">
            <button @click="viewMode = 'tree'" :class="{ active: viewMode === 'tree' }" class="toggle-btn">
              <Icon icon="mdi:file-tree" />
            </button>
            <button @click="viewMode = 'graph'" :class="{ active: viewMode === 'graph' }" class="toggle-btn">
              <Icon icon="mdi:graph" />
            </button>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-card">
          <Icon icon="mdi:server" class="stat-icon hosts" />
          <div class="stat-content">
            <span class="stat-value">{{ networkData.length }}</span>
            <span class="stat-label">Hosts</span>
          </div>
        </div>
        <div class="stat-card">
          <Icon icon="mdi:docker" class="stat-icon containers" />
          <div class="stat-content">
            <span class="stat-value">{{ totalContainers }}</span>
            <span class="stat-label">Containers</span>
          </div>
        </div>
        <div class="stat-card">
          <Icon icon="mdi:port" class="stat-icon ports" />
          <div class="stat-content">
            <span class="stat-value">{{ totalPorts }}</span>
            <span class="stat-label">Open Ports</span>
          </div>
        </div>
      </div>

      <!-- Tree view -->
      <div v-if="viewMode === 'tree'" class="tree-view">
        <div class="org-chart">
          <!-- Host rows -->
          <div v-for="host in networkData" :key="host.id" class="host-section">
            <!-- Host card -->
            <div class="org-node host-card">
              <div class="node-header">
                <div class="node-icon-wrapper host-icon">
                  <Icon icon="mdi:server" class="node-icon" />
                </div>
                <div class="node-info">
                  <h3 class="node-title">{{ host.name }}</h3>
                  <span class="node-meta">{{ getHostChildrenCount(host) }} services</span>
                </div>
              </div>
            </div>

            <!-- Vertical line down -->
            <div v-if="host.children?.length" class="org-line vertical"></div>

            <!-- Groups row -->
            <div v-if="host.children?.length" class="groups-container">
              <!-- Horizontal line connecting groups -->
              <div v-if="host.children.length > 1" class="org-line horizontal-top"></div>

              <div class="groups-row">
                <div v-for="group in host.children" :key="group.id" class="group-section">
                  <!-- Vertical line to group -->
                  <div class="org-line vertical short"></div>

                  <!-- Group card with list -->
                  <div class="org-node group-card" :class="getGroupClass(group)">
                    <div class="group-header">
                      <div class="node-icon-wrapper" :class="getGroupClass(group)">
                        <Icon :icon="getGroupIcon(group)" class="node-icon" />
                      </div>
                      <div class="node-info">
                        <h4 class="node-title">{{ group.name }}</h4>
                        <span class="node-meta">{{ group.children?.length || 0 }} items</span>
                      </div>
                    </div>

                    <!-- List of items inside the group card -->
                    <div class="items-list">
                      <!-- Group services by compose project or image -->
                      <template v-if="group.type === 'service-group'">
                        <div v-for="(items, subGroup) in groupServiceItems(group.children)" :key="subGroup"
                          class="service-subgroup">
                          <!-- Subgroup header -->
                          <div class="subgroup-header" @click="toggleSubgroup(subGroup)">
                            <button class="subgroup-collapse-btn">
                              <Icon :icon="collapsedSubgroups.has(subGroup) ? 'mdi:chevron-right' : 'mdi:chevron-down'"
                                class="collapse-icon-small" />
                            </button>
                            <h5 class="subgroup-title">{{ subGroup }}</h5>
                            <span class="subgroup-count">{{ items.length }}</span>
                          </div>

                          <!-- Subgroup items -->
                          <transition name="subgroup-slide">
                            <div v-show="!collapsedSubgroups.has(subGroup)" class="subgroup-items">
                              <div v-for="item in items" :key="item.id" class="list-item service-item">
                                <div class="item-icon-wrapper service-icon">
                                  <Icon :icon="getItemIcon(item)" class="item-icon" />
                                </div>
                                <div class="item-info">
                                  <span class="item-name">{{ item.name }}</span>
                                  <span v-if="item.image" class="item-detail">{{ item.image }}</span>
                                </div>
                                <span v-if="item.state" class="state-badge" :class="getStateClass(item.state)">
                                  {{ item.state }}
                                </span>
                              </div>
                            </div>
                          </transition>
                        </div>
                      </template>

                      <!-- Port items (no grouping needed) -->
                      <template v-else>
                        <div v-for="item in group.children" :key="item.id" class="list-item port-item">
                          <div class="item-icon-wrapper port-icon">
                            <Icon :icon="getItemIcon(item)" class="item-icon" />
                          </div>
                          <div class="item-info">
                            <span class="item-name">{{ item.name }}</span>
                            <span v-if="item.type === 'port'" class="item-detail">
                              {{ item.name.split('/')[1] }}
                            </span>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph view -->
      <div v-else class="graph-view">
        <div class="graph-container" ref="graphContainer">
          <svg class="graph-svg" :width="graphWidth" :height="graphHeight">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#6b8cae;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#6b9e7d;stop-opacity:0.3" />
              </linearGradient>
            </defs>

            <!-- Links -->
            <g class="links">
              <line v-for="link in graphLinks" :key="link.id" :x1="link.x1" :y1="link.y1" :x2="link.x2" :y2="link.y2"
                class="graph-link" :class="link.type" />
            </g>

            <!-- Nodes -->
            <g class="nodes">
              <g v-for="node in graphNodes" :key="node.id" :transform="`translate(${node.x}, ${node.y})`"
                class="graph-node" :class="node.type" @click="selectGraphNode(node)">
                <circle :r="node.radius" :class="{ selected: selectedNode?.id === node.id }" class="node-circle" />
                <text class="node-label" :y="node.radius + 20">
                  {{ node.label }}
                </text>
              </g>
            </g>
          </svg>

          <!-- Node detail panel -->
          <transition name="slide">
            <div v-if="selectedNode" class="node-detail-panel">
              <div class="panel-header">
                <Icon :icon="getNodeDetailIcon(selectedNode)" class="panel-icon" />
                <h3 class="panel-title">{{ selectedNode.label }}</h3>
                <button @click="selectedNode = null" class="panel-close">
                  <Icon icon="mdi:close" />
                </button>
              </div>

              <div class="panel-content">
                <div class="detail-item">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ selectedNode.type }}</span>
                </div>
                <div v-if="selectedNode.meta" class="detail-item">
                  <span class="detail-label">Details</span>
                  <span class="detail-value">{{ selectedNode.meta }}</span>
                </div>
                <div v-if="selectedNode.connections" class="detail-item">
                  <span class="detail-label">Connections</span>
                  <span class="detail-value">{{ selectedNode.connections }}</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useNetworkStore } from '../stores/networkStore';
import type { HostNode, ServiceNode, PortNode, ServiceGroupNode, PortGroupNode } from '../stores/networkStore';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  meta?: string;
  connections?: number;
}

interface GraphLink {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: string;
}

const networkStore = useNetworkStore();

const expandedNodes = ref<Set<string>>(new Set());
const collapsedSubgroups = ref<Set<string>>(new Set());
const viewMode = ref<'tree' | 'graph'>('tree');

// Graph view state
const graphContainer = ref<HTMLElement | null>(null);
const graphWidth = ref(1200);
const graphHeight = ref(800);
const graphNodes = ref<GraphNode[]>([]);
const graphLinks = ref<GraphLink[]>([]);
const selectedNode = ref<GraphNode | null>(null);

// Computed properties from store
const networkData = computed(() => networkStore.topology);
const isLoading = computed(() => networkStore.isLoading);
const totalContainers = computed(() => networkStore.totalContainers);
const totalPorts = computed(() => networkStore.totalPorts);

const isRefreshing = ref(false);

const fetchNetworkData = async () => {
  try {
    await networkStore.fetchTopology();

    // Auto-expand all nodes on first load
    if (expandedNodes.value.size === 0) {
      networkData.value.forEach((host: HostNode) => {
        expandedNodes.value.add(host.id);
        host.children?.forEach(child => {
          expandedNodes.value.add(child.id);
        });
      });
    }

    // Generate graph data
    generateGraphData();
  } catch (error) {
    console.error('Error fetching network data:', error);
  }
};

const refreshNetwork = async () => {
  isRefreshing.value = true;
  try {
    await networkStore.refreshTopology();
    generateGraphData();
  } finally {
    isRefreshing.value = false;
  }
};

const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

const toggleSubgroup = (subgroupId: string) => {
  if (collapsedSubgroups.value.has(subgroupId)) {
    collapsedSubgroups.value.delete(subgroupId);
  } else {
    collapsedSubgroups.value.add(subgroupId);
  }
};

const groupServiceItems = (items: ServiceNode[]) => {
  const groups: Record<string, ServiceNode[]> = {};

  items.forEach((item) => {
    // Try to extract compose project from labels or use image name
    let groupKey = 'other';

    // Check if item has compose project info (would be in labels)
    // For now, group by image base name since we don't have labels
    if (item.image) {
      const imageParts = item.image.split(':')[0].split('/');
      groupKey = imageParts[imageParts.length - 1] || 'other';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
  });

  return groups;
};

const getHostChildrenCount = (host: HostNode) => {
  let count = 0;
  host.children?.forEach(group => {
    count += group.children?.length || 0;
  });
  return count;
};

const getGroupIcon = (group: ServiceGroupNode | PortGroupNode) => {
  if (group.type === 'service-group') return 'mdi:docker';
  if (group.type === 'port-group') return 'mdi:ethernet';
  return 'mdi:folder';
};

const getGroupClass = (group: ServiceGroupNode | PortGroupNode) => {
  if (group.type === 'service-group') return 'service-group-icon';
  if (group.type === 'port-group') return 'port-group-icon';
  return '';
};

const getGroupBadgeClass = (group: ServiceGroupNode | PortGroupNode) => {
  if (group.type === 'service-group') return 'service-badge';
  if (group.type === 'port-group') return 'port-badge';
  return '';
};

const getGroupBadgeText = (group: ServiceGroupNode | PortGroupNode) => {
  if (group.type === 'service-group') return 'Containers';
  if (group.type === 'port-group') return 'Ports';
  return 'Group';
};

const getItemClass = (item: ServiceNode | PortNode) => {
  if (item.type === 'service') return 'service-item';
  if (item.type === 'port') return 'port-item';
  return '';
};

const getItemIconClass = (item: ServiceNode | PortNode) => {
  if (item.type === 'service') return 'service-icon';
  if (item.type === 'port') return 'port-icon';
  return '';
};

const getItemIcon = (item: ServiceNode | PortNode) => {
  if (item.type === 'service') return 'mdi:application';
  if (item.type === 'port') return 'mdi:lan-connect';
  return 'mdi:circle';
};

const getStateClass = (state: string) => {
  const lowerState = state.toLowerCase();
  if (lowerState.includes('running') || lowerState.includes('up')) return 'state-running';
  if (lowerState.includes('exited') || lowerState.includes('stopped')) return 'state-stopped';
  return 'state-other';
};

const generateGraphData = () => {
  if (!graphContainer.value) return;

  const containerRect = graphContainer.value.getBoundingClientRect();
  graphWidth.value = Math.max(1200, containerRect.width);
  graphHeight.value = Math.max(800, containerRect.height);

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const centerX = graphWidth.value / 2;
  const centerY = graphHeight.value / 2;
  const hostRadius = 200;

  networkData.value.forEach((host, hostIndex) => {
    const angle = (hostIndex / networkData.value.length) * Math.PI * 2;
    const hostX = centerX + Math.cos(angle) * hostRadius;
    const hostY = centerY + Math.sin(angle) * hostRadius;

    const hostNode: GraphNode = {
      id: host.id,
      label: host.name,
      type: 'host',
      x: hostX,
      y: hostY,
      radius: 30,
      connections: host.children?.length || 0
    };
    nodes.push(hostNode);

    let childIndex = 0;
    host.children?.forEach(group => {
      group.children?.forEach(item => {
        const itemAngle = angle + (childIndex / 10) * Math.PI * 0.5 - Math.PI * 0.25;
        const itemDistance = 120;
        const itemX = hostX + Math.cos(itemAngle) * itemDistance;
        const itemY = hostY + Math.sin(itemAngle) * itemDistance;

        const itemNode: GraphNode = {
          id: item.id,
          label: item.name,
          type: item.type,
          x: itemX,
          y: itemY,
          radius: 15,
          meta: (item as ServiceNode).image || `${item.name.split('/')[1]} protocol`
        };
        nodes.push(itemNode);

        links.push({
          id: `${host.id}-${item.id}`,
          x1: hostX,
          y1: hostY,
          x2: itemX,
          y2: itemY,
          type: item.type
        });

        childIndex++;
      });
    });
  });

  graphNodes.value = nodes;
  graphLinks.value = links;
};

const selectGraphNode = (node: GraphNode) => {
  selectedNode.value = selectedNode.value?.id === node.id ? null : node;
};

const getNodeDetailIcon = (node: GraphNode) => {
  if (node.type === 'host') return 'mdi:server';
  if (node.type === 'service') return 'mdi:docker';
  if (node.type === 'port') return 'mdi:ethernet';
  return 'mdi:circle';
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  fetchNetworkData();

  if (graphContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      generateGraphData();
    });
    resizeObserver.observe(graphContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Rajdhani:wght@300;400;500;600;700&display=swap');

/* Root */
.network-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8e8;
}

/* Background layers */
.background-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at top left, rgba(16, 24, 32, 0.9) 0%, rgba(8, 12, 16, 0.95) 100%),
    linear-gradient(135deg, #0a0e12 0%, #121820 50%, #0f1419 100%);
  z-index: 0;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(107, 140, 174, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(107, 140, 174, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 1;
}

/* Loading state */
.loading-state {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-card {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(107, 140, 174, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

.pulse-loader {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #6b8cae;
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-ring:nth-child(2) {
  animation-delay: 0.4s;
}

.pulse-ring:nth-child(3) {
  animation-delay: 0.8s;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }

  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

.loading-text {
  font-size: 1.125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  letter-spacing: 0.05em;
  font-family: 'Orbitron', monospace;
}

/* Main content */
.main-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow: hidden;
}

/* Header */
.header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.title-icon {
  font-size: 36px;
  color: #6b8cae;
  margin-top: 2px;
  filter: drop-shadow(0 0 8px rgba(107, 140, 174, 0.4));
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.02em;
  line-height: 1.1;
  font-family: 'Orbitron', monospace;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(107, 140, 174, 0.3);
}

.subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  letter-spacing: 0.02em;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  background: rgba(107, 140, 174, 0.15);
  border: 1px solid rgba(107, 140, 174, 0.3);
  border-radius: 10px;
  color: #7fa1c3;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: 'Orbitron', monospace;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(107, 140, 174, 0.25);
  border-color: rgba(107, 140, 174, 0.5);
  box-shadow: 0 0 20px rgba(107, 140, 174, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 20px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.toggle-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
}

.toggle-btn.active {
  background: rgba(107, 140, 174, 0.2);
  color: #7fa1c3;
  box-shadow: 0 0 15px rgba(107, 140, 174, 0.2);
}

/* Stats bar */
.stats-bar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-bar {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: rgba(20, 25, 32, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(25, 30, 38, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 8px currentColor);
}

.stat-icon.hosts {
  color: #7fa1c3;
}

.stat-icon.containers {
  color: #8bc4a0;
}

.stat-icon.ports {
  color: #d4a574;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  font-family: 'Orbitron', monospace;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

/* Tree view - Organizational Chart */
.tree-view {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 2rem;
}

.tree-view::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tree-view::-webkit-scrollbar-track {
  background: transparent;
}

.tree-view::-webkit-scrollbar-thumb {
  background: rgba(107, 140, 174, 0.2);
  border-radius: 4px;
}

.tree-view::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 140, 174, 0.3);
}

.org-chart {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  align-items: center;
  min-width: max-content;
}

.host-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* Organizational lines */
.org-line {
  background: rgba(107, 140, 174, 0.3);
  position: relative;
}

.org-line.vertical {
  width: 2px;
  height: 40px;
  margin: 0 auto;
}

.org-line.vertical.short {
  height: 30px;
}

.org-line.horizontal-top {
  height: 2px;
  width: calc(100% - 100px);
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 0;
}

/* Groups container */
.groups-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.groups-row {
  display: flex;
  gap: 3rem;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.group-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Node cards */
.org-node {
  background: rgba(20, 25, 32, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.org-node:hover {
  background: rgba(25, 30, 38, 0.9);
  border-color: rgba(107, 140, 174, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.host-card {
  border-left: 4px solid #7fa1c3;
  box-shadow: 0 4px 20px rgba(107, 140, 174, 0.15);
  padding: 1.25rem 1.5rem;
  min-width: 280px;
}

@media (max-width: 640px) {
  .host-card, .group-card {
    min-width: calc(100vw - 4rem);
  }
}

.group-card {
  border-left: 3px solid rgba(255, 255, 255, 0.15);
  min-width: 280px;
  max-width: 400px;
  padding: 0;
  overflow: hidden;
}

.group-card.service-group-icon {
  border-left-color: #8bc4a0;
}

.group-card.port-group-icon {
  border-left-color: #d4a574;
}

/* Node structure */
.node-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.node-icon-wrapper {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.host-icon {
  background: rgba(107, 140, 174, 0.15);
}

.service-group-icon {
  background: rgba(107, 158, 125, 0.15);
}

.port-group-icon {
  background: rgba(212, 165, 116, 0.15);
}

.org-node:hover .node-icon-wrapper {
  transform: scale(1.1);
  box-shadow: 0 0 16px currentColor;
}

.node-icon {
  font-size: 22px;
}

.host-icon .node-icon {
  color: #7fa1c3;
}

.service-group-icon .node-icon {
  color: #8bc4a0;
}

.port-group-icon .node-icon {
  color: #d4a574;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.node-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.02em;
  font-family: 'Orbitron', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-meta {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
}

/* Items list inside group cards */
.items-list {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow-y: auto;
}

.items-list::-webkit-scrollbar {
  width: 6px;
}

.items-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.items-list::-webkit-scrollbar-thumb {
  background: rgba(107, 140, 174, 0.3);
  border-radius: 3px;
}

/* Service subgroups */
.service-subgroup {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.service-subgroup:last-child {
  border-bottom: none;
}

.subgroup-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.subgroup-header:hover {
  background: rgba(255, 255, 255, 0.04);
}

.subgroup-collapse-btn {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subgroup-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

.collapse-icon-small {
  font-size: 16px;
  transition: transform 0.2s ease;
}

.subgroup-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  flex: 1;
  font-family: 'Orbitron', monospace;
}

.subgroup-count {
  padding: 0.25rem 0.5rem;
  background: rgba(107, 140, 174, 0.12);
  color: #7fa1c3;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
  border: 1px solid rgba(107, 140, 174, 0.2);
}

.subgroup-items {
  background: rgba(0, 0, 0, 0.1);
}

.subgroup-slide-enter-active,
.subgroup-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.subgroup-slide-enter-from,
.subgroup-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.subgroup-slide-enter-to,
.subgroup-slide-leave-from {
  opacity: 1;
  max-height: 500px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.2s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.service-item {
  border-left: 3px solid transparent;
}

.service-item:hover {
  border-left-color: #8bc4a0;
  background: rgba(107, 158, 125, 0.05);
}

.port-item {
  border-left: 3px solid transparent;
}

.port-item:hover {
  border-left-color: #d4a574;
  background: rgba(212, 165, 116, 0.05);
}

.item-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.service-icon {
  background: rgba(107, 158, 125, 0.12);
}

.port-icon {
  background: rgba(212, 165, 116, 0.12);
}

.list-item:hover .item-icon-wrapper {
  transform: scale(1.1);
}

.item-icon {
  font-size: 16px;
}

.service-icon .item-icon {
  color: #8bc4a0;
}

.port-icon .item-icon {
  color: #d4a574;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-detail {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.state-badge {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Orbitron', monospace;
  flex-shrink: 0;
}

.state-running {
  background: rgba(107, 158, 125, 0.2);
  color: #8bc4a0;
  border: 1px solid rgba(107, 158, 125, 0.3);
}

.state-stopped {
  background: rgba(214, 93, 93, 0.2);
  color: #d68a8a;
  border: 1px solid rgba(214, 93, 93, 0.3);
}

.state-other {
  background: rgba(140, 140, 150, 0.2);
  color: #a8a8b4;
  border: 1px solid rgba(140, 140, 150, 0.3);
}

/* Graph view */
.graph-view {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: rgba(20, 25, 32, 0.3);
  border: 1px solid rgba(107, 140, 174, 0.15);
  border-radius: 16px;
  overflow: hidden;
}

.graph-svg {
  width: 100%;
  height: 100%;
}

.graph-link {
  stroke: url(#linkGradient);
  stroke-width: 2;
  transition: all 0.3s ease;
}

.graph-link.service {
  stroke: rgba(107, 158, 125, 0.4);
}

.graph-link.port {
  stroke: rgba(212, 165, 116, 0.4);
}

.graph-node {
  cursor: pointer;
  transition: all 0.3s ease;
}

.node-circle {
  fill: rgba(30, 35, 42, 0.9);
  stroke-width: 2;
  transition: all 0.3s ease;
}

.graph-node.host .node-circle {
  stroke: #7fa1c3;
  filter: drop-shadow(0 0 8px rgba(107, 140, 174, 0.5));
}

.graph-node.service .node-circle {
  stroke: #8bc4a0;
  filter: drop-shadow(0 0 6px rgba(107, 158, 125, 0.5));
}

.graph-node.port .node-circle {
  stroke: #d4a574;
  filter: drop-shadow(0 0 6px rgba(212, 165, 116, 0.5));
}

.graph-node:hover .node-circle,
.node-circle.selected {
  filter: drop-shadow(0 0 16px currentColor) url(#glow);
  stroke-width: 3;
}

.node-label {
  fill: #ffffff;
  font-size: 12px;
  font-weight: 600;
  text-anchor: middle;
  font-family: 'Orbitron', monospace;
  pointer-events: none;
  letter-spacing: 0.05em;
}

/* Node detail panel */
.node-detail-panel {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 320px;
  background: rgba(20, 25, 32, 0.95);
  border: 1px solid rgba(107, 140, 174, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-icon {
  font-size: 24px;
  color: #7fa1c3;
}

.panel-title {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  font-family: 'Orbitron', monospace;
}

.panel-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.panel-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.detail-value {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  word-break: break-word;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-bar {
    grid-template-columns: 1fr;
  }

  .items-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .node-detail-panel {
    left: 1rem;
    right: 1rem;
    width: auto;
  }
}
</style>