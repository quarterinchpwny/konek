<template>
  <div class="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0a0a0c] font-sans text-slate-300 md:flex-row">
    <header class="relative z-30 flex shrink-0 items-center justify-between border-b border-white/5 bg-[#0f1419] px-4 py-3.5 md:hidden">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
          <Terminal :size="16" />
        </div>
        <span class="text-base font-bold tracking-[-0.02em] text-white">Konek</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/7 bg-white/5 text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="isMobileMenuOpen"
        >
          <X v-if="isMobileMenuOpen" :size="22" />
          <Menu v-else :size="22" />
        </button>
      </div>
    </header>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-[39] bg-black/60 backdrop-blur-sm"
        @click="isMobileMenuOpen = false"
        aria-hidden="true"
      />
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-40 w-max max-w-[85vw] -translate-x-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:static md:max-w-none md:translate-x-0 md:shrink-0"
      :class="{ 'translate-x-0': isMobileMenuOpen }"
      aria-label="Navigation"
    >
      <DashboardSideBar @close="isMobileMenuOpen = false" />
    </aside>

    <main class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import DashboardSideBar from "../components/navigation/DashboardSideBar.vue";
import { Terminal, Menu, X } from "lucide-vue-next";

const isMobileMenuOpen = ref(false);
const route = useRoute();

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);
</script>
