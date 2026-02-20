<template>
  <div class="terminal-wrapper">
    <!-- Background -->
    <div class="terminal-bg"></div>
    <div class="terminal-noise"></div>

    <!-- Status Bar -->
    <div class="status-bar" :class="{ 'status-connected': isConnected }">
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span class="status-text">{{ statusMessage }}</span>
      </div>
      <div class="status-info">
        <span class="status-label">Session:</span>
        <span class="status-value">{{ sessionId?.substring(0, 8) }}...</span>
      </div>
    </div>

    <!-- Terminal -->
    <div ref="terminalContainer" class="xterm-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import axios from 'axios';

const props = defineProps({
  sessionId: String,
  hostId: Number, // Add this line
  tmuxSessionName: String, // Prop for tmux session
});

const terminalContainer = ref<HTMLElement | null>(null);
const isConnected = ref(false);
const statusMessage = ref("Initializing...");

let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;
let resizeObserver: ResizeObserver | null = null;

const logActivity = async (actionType: string, details: string) => {
  if (props.hostId == null) {
    console.warn('Cannot log activity: hostId is null.');
    return;
  }
  try {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/activity`, { hostId: props.hostId, actionType, details });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

const wsUrl = computed(() => {
  const host = window.location.hostname;
  let url = `ws://${host}:3000?sessionId=${props.sessionId}`;
  if (props.tmuxSessionName) {
    url += `&tmuxSessionName=${props.tmuxSessionName}`;
  }
  return url;
});

const initTerminal = () => {
  if (!terminalContainer.value) return;

  const isMobile = window.innerWidth < 768;

  term = new Terminal({
    cursorBlink: true,
    fontSize: isMobile ? 12 : 14,
    fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#0a0e12",
      foreground: "#e8e8e8",
      cursor: "#7fa1c3",
      cursorAccent: "#0a0e12",
      black: "#0a0e12",
      red: "#d68a8a",
      green: "#8bc4a0",
      yellow: "#e8c368",
      blue: "#7fa1c3",
      magenta: "#b19dd4",
      cyan: "#7dc4e4",
      white: "#e8e8e8",
      brightBlack: "#3d4450",
      brightRed: "#e89b9b",
      brightGreen: "#9dd4b1",
      brightYellow: "#f0d179",
      brightBlue: "#90b2d4",
      brightMagenta: "#c2aee5",
      brightCyan: "#8ed5f5",
      brightWhite: "#ffffff",
    },
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalContainer.value);

  fitAddon.fit();

  let command_buffer = "";
  term.onData((data) => {
    if (socket?.readyState === WebSocket.OPEN) {
      // Handle backspace
      if (data === '\x7F' || data === '\b') { // \x7F is DEL, \b is BS
        if (command_buffer.length > 0) {
          command_buffer = command_buffer.slice(0, -1);
        }
      } else if (data === '\r') {
        // Only log if the command_buffer is not empty after stripping whitespace
        const trimmedCommand = command_buffer.trim();
        if (trimmedCommand.length > 0) {
          logActivity('command', trimmedCommand);
        }
        command_buffer = "";
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) { // Only append printable characters
        command_buffer += data;
      }
      socket.send(data)
    };
  });

  connectWebSocket();
};

const connectWebSocket = () => {
  if (!term || !fitAddon) return;

  const dims = fitAddon.proposeDimensions();
  const cols = dims?.cols || 80;
  const rows = dims?.rows || 24;

  socket = new WebSocket(`${wsUrl.value}&cols=${cols}&rows=${rows}`);

  socket.onopen = () => {
    isConnected.value = true;
    statusMessage.value = "Connected";
    term?.focus();
    socket?.send("neofetch\n");
  };

  socket.onmessage = (event) => {
    if (typeof event.data === "string") {
      term?.write(event.data);
    } else {
      const reader = new FileReader();
      reader.onload = () => term?.write(reader.result as string);
      reader.readAsText(event.data);
    }
  };

  socket.onclose = () => {
    isConnected.value = false;
    statusMessage.value = "Disconnected";
    term?.write("\r\n\x1b[31m✗ Connection closed.\x1b[0m\r\n");
  };

  socket.onerror = (err) => {
    console.error("WebSocket Error:", err);
    statusMessage.value = "Connection Error";
  };
};

const handleResize = () => {
  fitAddon?.fit();
};

onMounted(() => {
  setTimeout(() => {
    initTerminal();

    if (terminalContainer.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(terminalContainer.value);
    }

    window.addEventListener("resize", handleResize);
  }, 50);
});

onBeforeUnmount(() => {
  socket?.close();
  term?.dispose();
  resizeObserver?.disconnect();
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

.terminal-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
}

/* Background */
.terminal-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
  z-index: 0;
}

.terminal-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Status bar */
.status-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: rgba(20, 25, 32, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .status-bar {
    padding: 0.75rem 1.25rem;
  }
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(214, 138, 138, 0.8);
  transition: all 0.3s ease;
  box-shadow: 0 0 8px rgba(214, 138, 138, 0.5);
}

.status-connected .status-dot {
  background: rgba(139, 196, 160, 0.9);
  box-shadow: 0 0 12px rgba(139, 196, 160, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

.status-text {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: -0.01em;
}

.status-connected .status-text {
  color: rgba(255, 255, 255, 0.9);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.status-label {
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.status-value {
  color: rgba(255, 255, 255, 0.7);
  font-family: 'JetBrains Mono', monospace;
  padding: 0.25rem 0.5rem;
  background: rgba(30, 35, 42, 0.6);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Terminal container */
.xterm-container {
  position: relative;
  z-index: 2;
  flex: 1;
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  overflow: hidden;
}

@media (min-width: 768px) {
  .xterm-container {
    padding: 1rem;
  }
}

/* Override xterm styles */
:deep(.xterm) {
  height: 100%;
  padding: 0;
}

:deep(.xterm-viewport) {
  overflow-y: auto;
  background: transparent !important;
}

:deep(.xterm-viewport)::-webkit-scrollbar {
  width: 8px;
}

:deep(.xterm-viewport)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.xterm-viewport)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

:deep(.xterm-viewport)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

:deep(.xterm-screen) {
  padding: 0.5rem;
}

:deep(.xterm-cursor-layer) {
  animation: blink 1.2s step-end infinite;
}

@keyframes blink {

  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}

/* Selection styling */
:deep(.xterm-selection) {
  background: rgba(127, 161, 195, 0.3) !important;
}

.terminal-modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* To this: */
.terminal-modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
  /* ← ADD THIS LINE - Critical for flexbox child sizing */
}
</style>