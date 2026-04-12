<template>
  <component v-if="authStore.isReady && authStore.isAuthenticated" :is="layout" />
  <AuthGate v-else-if="authStore.isReady" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AuthGate from "./components/AuthGate.vue";
import { useAuthStore } from "./stores/authStore";

const route = useRoute();
const authStore = useAuthStore();

const layout = computed(() => route.meta.layout);
</script>
