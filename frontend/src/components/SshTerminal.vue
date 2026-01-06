<template>
  <div class="terminal-wrapper">
    <div class="status-bar" :class="{ connected: isConnected }">
      <span class="status-dot"></span>
      {{ statusMessage }}
    </div>

    <div ref="terminalContainer" class="xterm-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css"; // Import Xterm CSS

const props = defineProps({
  sessionId: String,
});
const wsUrl = computed(() => {
  const host = window.location.hostname;
  return `ws://${host}:3000?sessionId=${props.sessionId}`;
});
const terminalContainer = ref<HTMLElement | null>(null);
const isConnected = ref(false);
const statusMessage = ref("Initializing...");

let term: Terminal | null = null;
let socket: WebSocket | null = null;
let fitAddon: FitAddon | null = null;
let resizeObserver: ResizeObserver | null = null;

// Initialize Terminal
const initTerminal = () => {
  if (!terminalContainer.value) return;

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#1e1e1e",
      foreground: "#ffffff",
    },
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalContainer.value);

  // Initial fit to get dimensions
  fitAddon.fit();

  // Handle user input -> send to WebSocket
  term.onData((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });

  connectWebSocket();
};

// Connect to Backend
const connectWebSocket = () => {
  if (!term || !fitAddon) return;

  const dims = fitAddon.proposeDimensions();
  const cols = dims ? dims.cols : 80;
  const rows = dims ? dims.rows : 24;

  // Connection URL with dimensions
  const _wsUrl = `${wsUrl.value}&cols=${cols}&rows=${rows}`;

  socket = new WebSocket(_wsUrl);
  console.log(socket);
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
      reader.onload = () => {
        term?.write(reader.result as string);
      };
      reader.readAsText(event.data);
    }
  };

  socket.onclose = () => {
    isConnected.value = false;
    statusMessage.value = "Disconnected";
    term?.write("\r\n\x1b[31mConnection closed.\x1b[0m\r\n");
  };

  socket.onerror = (err) => {
    console.error("WebSocket Error:", err);
    statusMessage.value = "Connection Error";
  };
};

// Handle Window Resize
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit();
    // Note: If your backend supports dynamic resizing,
    // you would send a special JSON message here with new cols/rows.
    // The current index.ts only sets size on initial connection.
  }
};

onMounted(() => {
  // Small delay to ensure DOM is rendered for accurate sizing
  setTimeout(() => {
    initTerminal();

    // Watch for container resize
    if (terminalContainer.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(terminalContainer.value);
    }

    window.addEventListener("resize", handleResize);
  }, 100);
});

onBeforeUnmount(() => {
  if (socket) socket.close();
  if (term) term.dispose();
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.terminal-wrapper {
  height: 100vh;
  width: 100%;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.status-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #252526;
  color: #cccccc;
  font-size: 0.85rem;
  border-bottom: 1px solid #333;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #666; /* Disconnected color */
  margin-right: 8px;
  transition: background-color 0.3s ease;
}

.status-bar.connected .status-dot {
  background-color: #4caf50; /* Connected Green */
}

.xterm-container {
  flex: 1;
  width: 100%;
  height: 100%;
  /* Padding inside the terminal area */
  padding: 10px;
  box-sizing: border-box;
}

/* Override xterm scrollbar to look nicer */
:deep(.xterm-viewport) {
  overflow-y: auto;
}
</style>