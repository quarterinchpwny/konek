<template>
  <div id="app">
    <header class="bg-gray-900 text-white p-4 shadow-md">
      <nav class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold"> File Browser</h1>
        <div>
          <!-- Navigation could go here if more views are added -->
        </div>
      </nav>
    </header>
    <main class="container mx-auto p-4">
      <!-- Host Manager Section -->
      <section class="mb-8">
        <HostManager />
      </section>

      <!-- Home View (Terminal and File Manager) Section -->
      <section>
        <HomeView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import HostManager from './components/HostManager.vue';
import HomeView from './views/HomeView.vue';
</script>

<style>
/* Global styles or base typography can go here */
body {
  background-color: #1a202c; /* A dark background for the whole app */
  color: #e2e8f0; /* Light text for readability */
}
</style>