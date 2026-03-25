<template>
  <main class="auth-shell">
    <div class="auth-panel">
      <div class="auth-kicker">Konek Security</div>
      <h1>Unlock dashboard access</h1>
      <p>Enter the backend password</p>
      <form class="auth-form" @submit.prevent="submit">
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
        />
        <button
          :disabled="authStore.isLoading || password.length === 0"
          type="submit"
        >
          {{ authStore.isLoading ? "Checking..." : "Sign in" }}
        </button>
      </form>
      <p v-if="authStore.error" class="auth-error">{{ authStore.error }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { useAuthStore } from "../stores/authStore";

const authStore = useAuthStore();
const password = ref("");

const submit = async () => {
  await authStore.login(password.value);
  password.value = "";
};
</script>

<style scoped>
@reference "../assets/css/main.css";

.auth-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(14, 44, 90, 0.18), transparent 35%),
    linear-gradient(160deg, #07111a 0%, #0e1d26 45%, #07111a 100%);
  @apply grid place-items-center p-8;
}

.auth-panel {
  background: rgba(9, 16, 24, 0.92);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  @apply w-full max-w-[28rem] rounded-3xl border border-slate-400/18 p-8;
}

.auth-kicker {
  @apply text-[0.8rem] uppercase tracking-[0.18em] text-[#7dd3a7];
}

h1 {
  @apply my-3 text-[2rem] text-slate-50;
}

p {
  @apply m-0 text-slate-400;
}

.auth-form {
  @apply mt-6 grid gap-[0.85rem];
}

input,
button {
  @apply w-full rounded-[0.9rem] border border-slate-400/18 px-4 py-[0.9rem];
  font: inherit;
}

input {
  background: rgba(15, 23, 42, 0.78);
  @apply text-slate-50;
}

button {
  background: #86efac;
  @apply font-bold text-[#08130d];
}

button:disabled {
  @apply cursor-not-allowed opacity-60;
}

.auth-error {
  @apply mt-4 text-red-300;
}
</style>
