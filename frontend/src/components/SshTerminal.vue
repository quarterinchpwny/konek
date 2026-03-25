<template>
  <div v-if="sessionId" class="terminal-host">
    <SshTabbedTerminal :session-id="sessionId" :host-id="hostId" />
  </div>
  <div v-else class="terminal-unavailable">No SSH session available.</div>
</template>

<script setup lang="ts">
import SshTabbedTerminal from "./ssh-terminal/SshTabbedTerminal.vue";

defineProps<{
  sessionId?: string | null;
  hostId?: number | null;
}>();
</script>

<style scoped>
.terminal-host,
.terminal-unavailable {
  height: 100%;
}

.terminal-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
}
</style>
