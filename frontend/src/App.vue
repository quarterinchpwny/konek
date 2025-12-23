<template>
  <div id="app">
    <header class="text-white p-5">
      <nav
        class="bg-gray-900 py-5 px-4 rounded-xl mx-auto flex justify-between items-center"
      >
        <h1 class="text-xl">Konek</h1>
        <div>
          <!-- Navigation could go here if more views are added -->
        </div>
      </nav>
    </header>
    <main class="container mx-auto p-4">
      <!-- Host Manager Section -->
      <section class="mb-8">
        <HostManager @select-host="handleHostSelection" />
      </section>

      <!-- Home View (Terminal and File Manager) Section -->
      <section v-if="selectedHost">
        <HomeView :selected-host="selectedHost" />
      </section>
      <section v-else class="text-center text-gray-400 p-8">
        <p class="text-lg">
          Please select a host from the list above to connect and manage.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import HostManager from "./components/HostManager.vue";
import HomeView from "./views/HomeView.vue";
import { type Host } from "./stores/hostStore"; // Import Host type

const selectedHost = ref<Host | null>(null);

const handleHostSelection = (host: Host) => {
  selectedHost.value = host;
};
</script>

<style>
/* Global styles or base typography can go here */
body {
  background-color: #1a202c; /* A dark background for the whole app */
  color: #e2e8f0; /* Light text for readability */
}
</style>
