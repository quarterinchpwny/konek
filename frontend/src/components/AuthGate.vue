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
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top, rgba(14, 44, 90, 0.18), transparent 35%),
    linear-gradient(160deg, #07111a 0%, #0e1d26 45%, #07111a 100%);
}

.auth-panel {
  width: min(28rem, 100%);
  padding: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.5rem;
  background: rgba(9, 16, 24, 0.92);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}

.auth-kicker {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #7dd3a7;
}

h1 {
  margin: 0.75rem 0;
  font-size: 2rem;
  color: #f8fafc;
}

p {
  margin: 0;
  color: #94a3b8;
}

.auth-form {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.5rem;
}

input,
button {
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  padding: 0.9rem 1rem;
  font: inherit;
}

input {
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.78);
}

button {
  color: #08130d;
  background: #86efac;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.auth-error {
  margin-top: 1rem;
  color: #fca5a5;
}
</style>
