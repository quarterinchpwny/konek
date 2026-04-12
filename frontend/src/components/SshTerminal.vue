<template>
  <div v-if="sessionId" class="h-full">
    <SshTabbedTerminal :session-id="sessionId" :host-id="hostId" />
  </div>
  <div v-else class="flex h-full items-center justify-center text-white/70">
    No SSH session available.
  </div>
</template>

<script setup lang="ts">
import SshTabbedTerminal from "./ssh-terminal/SshTabbedTerminal.vue";

defineProps<{
  sessionId?: string | null;
  hostId?: number | null;
}>();
</script>
