<template>
  <div
    class="h-screen w-full bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden flex"
  >
    <DashboardSideBar />

    <router-view></router-view>
  </div>
</template>
<script setup lang="ts">
import DashboardSideBar from "../components/navigation/DashboardSideBar.vue";
</script>
