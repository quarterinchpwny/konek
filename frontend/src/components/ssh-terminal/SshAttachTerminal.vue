<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0e12] font-['JetBrains_Mono',monospace]">
    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,20,25,0.86),rgba(10,14,18,0.94))]"></div>
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_0.5px,transparent_0.5px)] [background-size:8px_8px] opacity-[0.18]"></div>
    <div
      class="relative z-[1] flex items-center gap-3 border-b border-white/8 bg-[rgba(20,25,32,0.88)] px-[0.9rem] py-[0.7rem] text-[0.78rem] max-md:flex-wrap"
      :class="isConnected ? 'border-b-[#8bc4a0]/30' : ''"
    >
      <div class="flex shrink-0 items-center gap-[0.45rem] whitespace-nowrap">
        <div
          class="h-[0.55rem] w-[0.55rem] rounded-full"
          :class="isConnected ? 'bg-[#8bc4a0]' : 'bg-[#d68a8a]'"
        ></div>
        <span class="text-[#e8e8e8]">{{ statusMessage }}</span>
      </div>
      <div class="flex min-w-0 items-center gap-[0.45rem] whitespace-nowrap">
        <span class="uppercase tracking-[0.08em] text-white/[0.48]">{{ headerLabel }}</span>
        <span class="overflow-hidden text-ellipsis text-[#e8e8e8]">{{ headerValue }}</span>
      </div>
      <button
        class="ml-auto shrink-0 rounded-full border border-[#7fa1c3]/35 bg-[#7fa1c3]/12 px-[0.7rem] py-[0.4rem] text-[#dfe9f3] transition-colors duration-150 hover:bg-[#7fa1c3]/20 max-md:ml-0"
        type="button"
        @click="reconnectTerminal"
      >
        Reconnect
      </button>
    </div>
    <div ref="terminalContainer" class="relative z-[1] min-h-0 flex-1 p-[0.65rem] md:p-[0.85rem]"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import axios from "axios";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { buildBackendWebSocketUrl, createAuthenticatedWebSocket } from "../../services/api";

const props = defineProps<{
  sessionId: string;
  hostId?: number | null;
  label?: string;
  terminalTabId?: string | null;
}>();

const terminalContainer = ref<HTMLElement | null>(null);
const isConnected = ref(false);
const statusMessage = ref("Initializing...");

const textDecoder = new TextDecoder();

let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFrameId: number | null = null;
let delayedResizeTimeoutId: number | null = null;
let lastCols = 0;
let lastRows = 0;
let commandBuffer = "";
let isUnmounting = false;
let suppressCloseMessage = false;

const headerLabel = computed(() => "Tab");
const headerValue = computed(() => props.label || props.sessionId.slice(0, 8));

const wsUrl = computed(() => {
  const params: Record<string, string> = {
    sessionId: props.sessionId,
  };

  if (props.terminalTabId) {
    params.terminalTabId = props.terminalTabId;
  }

  return buildBackendWebSocketUrl(params);
});

const logActivity = async (details: string) => {
  if (props.hostId == null) {
    return;
  }

  try {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/activity`, {
      hostId: props.hostId,
      actionType: "command",
      details,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

const closeSocket = () => {
  if (!socket) {
    return;
  }

  const currentSocket = socket;
  socket = null;
  currentSocket.close();
};

const handleResize = () => {
  if (!term || !fitAddon) {
    return;
  }

  if (resizeFrameId !== null) {
    window.cancelAnimationFrame(resizeFrameId);
  }

  resizeFrameId = window.requestAnimationFrame(() => {
    fitAddon?.fit();
    const cols = term?.cols ?? 0;
    const rows = term?.rows ?? 0;

    if (!cols || !rows || (cols === lastCols && rows === lastRows)) {
      return;
    }

    lastCols = cols;
    lastRows = rows;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  });
};

const scheduleDelayedResize = () => {
  if (delayedResizeTimeoutId !== null) {
    window.clearTimeout(delayedResizeTimeoutId);
  }

  delayedResizeTimeoutId = window.setTimeout(() => {
    delayedResizeTimeoutId = null;
    handleResize();
  }, 150);
};

const connectWebSocket = () => {
  if (!term || !fitAddon) {
    return;
  }
  const hadSocket = socket != null;
  suppressCloseMessage = hadSocket;
  closeSocket();
  statusMessage.value = "Connecting...";

  const dims = fitAddon.proposeDimensions();
  const url = new URL(wsUrl.value);
  url.searchParams.set("cols", String(dims?.cols || 80));
  url.searchParams.set("rows", String(dims?.rows || 24));

  socket = createAuthenticatedWebSocket(url.toString());
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    suppressCloseMessage = false;
    isConnected.value = true;
    statusMessage.value = "Connected";
    lastCols = 0;
    lastRows = 0;
    handleResize();
    scheduleDelayedResize();
    term?.focus();
  };

  socket.onmessage = (event) => {
    if (typeof event.data === "string") {
      term?.write(event.data);
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      term?.write(textDecoder.decode(event.data));
    }
  };

  socket.onclose = () => {
    isConnected.value = false;
    statusMessage.value = "Disconnected";

    if (!isUnmounting && !suppressCloseMessage) {
      term?.write("\r\n\x1b[31mConnection closed.\x1b[0m\r\n");
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    statusMessage.value = "Connection error";
  };
};

const reconnectTerminal = () => {
  if (!term) {
    return;
  }
  suppressCloseMessage = true;
  isConnected.value = false;
  term.write("\r\n\x1b[33mReconnecting...\x1b[0m\r\n");
  connectWebSocket();
};

const initTerminal = () => {
  if (!terminalContainer.value) {
    return;
  }
  const isMobile = window.innerWidth < 768;
  term = new Terminal({
    cursorBlink: true,
    fontSize: isMobile ? 12 : 14,
    lineHeight: 1,
    letterSpacing: 0,
    rescaleOverlappingGlyphs: true,
    fontFamily:
      '"MesloLGS NF", "Meslo LG S DZ for Powerline", "CaskaydiaCove Nerd Font", "JetBrainsMono Nerd Font", "SauceCodePro Nerd Font", "JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
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
  term.write("\x1b[?7h");
  handleResize();

  if ("fonts" in document) {
    (document as Document & { fonts?: FontFaceSet }).fonts?.ready
      .then(() => handleResize())
      .catch(() => undefined);
  }

  term.onData((data) => {
    if (socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    if (data === "\x7F" || data === "\b") {
      commandBuffer = commandBuffer.slice(0, -1);
    } else if (data === "\r") {
      const trimmedCommand = commandBuffer.trim();
      if (trimmedCommand.length > 0) {
        void logActivity(trimmedCommand);
      }
      commandBuffer = "";
    } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
      commandBuffer += data;
    }

    socket.send(data);
  });

  connectWebSocket();
};

onMounted(async () => {
  await nextTick();
  window.setTimeout(() => {
    initTerminal();

    if (terminalContainer.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(terminalContainer.value);
    }

    window.addEventListener("resize", handleResize);
    scheduleDelayedResize();
  }, 50);
});

onBeforeUnmount(() => {
  isUnmounting = true;
  suppressCloseMessage = true;

  if (resizeFrameId !== null) {
    window.cancelAnimationFrame(resizeFrameId);
  }

  if (delayedResizeTimeoutId !== null) {
    window.clearTimeout(delayedResizeTimeoutId);
  }

  closeSocket();
  term?.dispose();
  resizeObserver?.disconnect();
  window.removeEventListener("resize", handleResize);
});
</script>
