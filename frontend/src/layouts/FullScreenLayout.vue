<template>
  <div
    class="h-screen w-full bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden"
  >
    <header>
      <div class="flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-2 px-6">
          <div class="p-2 bg-indigo-500/10 rounded-lg">
            <Terminal :size="20" class="text-indigo-400" />
          </div>
          <RouterLink :to="{ name: 'home' }">
            <h1 class="font-bold text-white tracking-tight text-lg">
              Konek
            </h1></RouterLink
          >
        </div>
        <div class="p-4 border-slate-800 bg-[#0c0c0e]">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50">
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold"
            >
              JD
            </div>
            <div class="flex-1 min-w-0 text-xs">
              <p class="text-white font-medium">Local User</p>
              <p class="text-slate-500 truncate">Settings & Profile</p>
            </div>
            <Settings :size="14" class="text-slate-600" />
          </div>
        </div>
      </div>
    </header>

    <router-view></router-view>
  </div>
</template>
<script setup lang="ts">
import { Terminal, Settings } from "lucide-vue-next";
</script>
