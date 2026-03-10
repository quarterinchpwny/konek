<template>
  <div class="app-shell">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="mobile-header-brand">
        <div class="brand-icon">
          <Terminal :size="16" />
        </div>
        <span class="brand-name">Konek</span>
      </div>
      <div class="mobile-header-actions">
        <button class="logout-btn" @click="logout" aria-label="Sign out">
          <LogOut :size="18" />
        </button>
        <button
          class="mobile-menu-btn"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="isMobileMenuOpen"
        >
          <X v-if="isMobileMenuOpen" :size="22" />
          <Menu v-else :size="22" />
        </button>
      </div>
    </header>

    <!-- Sidebar overlay (mobile backdrop) -->
    <Transition name="backdrop">
      <div
        v-if="isMobileMenuOpen"
        class="sidebar-backdrop"
        @click="isMobileMenuOpen = false"
        aria-hidden="true"
      />
    </Transition>

    <!-- Sidebar -->
    <Transition name="sidebar-slide">
      <aside
        v-show="true"
        class="sidebar-wrapper"
        :class="{ 'sidebar-open': isMobileMenuOpen }"
        aria-label="Navigation"
      >
        <DashboardSideBar @close="isMobileMenuOpen = false" />
      </aside>
    </Transition>

    <!-- Main content -->
    <main class="main-content">
      <button class="desktop-logout" @click="logout">
        <LogOut :size="16" />
        <span>Sign out</span>
      </button>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import DashboardSideBar from "../components/navigation/DashboardSideBar.vue";
import { Terminal, Menu, X, LogOut } from "lucide-vue-next";
import { useAuthStore } from "../stores/authStore";
import { useSshStore } from "../stores/SSHStore";

const isMobileMenuOpen = ref(false);
const route = useRoute();
const authStore = useAuthStore();
const sshStore = useSshStore();

const logout = async () => {
  sshStore.disconnect();
  await authStore.logout();
};

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);
</script>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────────────────────*/

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh; /* use dvh so mobile browser chrome is accounted for */
  width: 100%;
  background: #0a0a0c;
  color: #cbd5e1;
  font-family: sans-serif;
  overflow: hidden;
  position: relative;
}

@media (min-width: 768px) {
  .app-shell {
    flex-direction: row;
  }
}

/* ── Mobile header ───────────────────────────────────────────────────────────*/

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  background: #0f1419;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  z-index: 30;
  position: relative;
}

/* Hide on desktop — sidebar is always visible there */
@media (min-width: 768px) {
  .mobile-header {
    display: none;
  }
}

.mobile-header-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #94a3b8;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.logout-btn,
.desktop-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  cursor: pointer;
}

.logout-btn {
  width: 36px;
  height: 36px;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: white;
}

/* ── Backdrop ────────────────────────────────────────────────────────────────*/

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 39;
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────────*/

.sidebar-wrapper {
  /* Mobile: off-canvas, slides in from the left */
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  /* Don't let the sidebar exceed ~80% of screen on mobile */
  max-width: 85vw;
  width: max-content;
}

.sidebar-wrapper.sidebar-open {
  transform: translateX(0);
}

/* Desktop: always visible, part of normal flow */
@media (min-width: 768px) {
  .sidebar-wrapper {
    position: relative;
    top: auto;
    left: auto;
    bottom: auto;
    transform: none !important;
    max-width: none;
    flex-shrink: 0;
    z-index: auto;
  }
}

/* ── Main content ────────────────────────────────────────────────────────────*/

.main-content {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.desktop-logout {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 20;
  padding: 0.65rem 0.9rem;
}

@media (max-width: 767px) {
  .desktop-logout {
    display: none;
  }
}
</style>
