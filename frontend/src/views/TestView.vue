<template>
  <div class="h-full w-full transition-colors duration-500">
    <div class="grid grid-cols-12 p-3 gap-4 mt-2 h-full">
      <Transition name="slide">
        <div
          v-show="!hideSideBar"
          :class="[
            sidebarClass,
            'p-2  bg-gray-100 cursor-pointer overflow-hidden transition-all duration-300 ease-in-out rounded-lg card-outline',
          ]"
          @click="toggleWidth"
        >
          <span
            @click.stop="hideSideBar = true"
            class="font-bold whitespace-nowrap"
          >
            BASTE 1 (Click to Hide, Click Div to Grow)
          </span>
        </div>
      </Transition>

      <div
        :class="`p-2 bg-gray-100 shadow-inner rounded-lg ${contentClass} card-outline`"
      >
        <span
          @click.stop="hideSideBar = false"
          class="cursor-pointer font-bold"
        >
          BASTE 2 (Click to Show Baste 1)
        </span>
      </div>
      <div class="col-span-2 bg-gray-100 p-2 rounded-lg card-outline">
        Baste 3
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const sidebarClass = ref("col-span-2");
const contentClass = ref("col-span-8");
const hideSideBar = ref(false);

function toggleWidth() {
  sidebarClass.value =
    sidebarClass.value === "col-span-1" ? "col-span-2" : "col-span-1";
  contentClass.value =
    contentClass.value === "col-span-8" ? "col-span-9" : "col-span-8";
}
</script>

<style scoped>
/* Smooth slide animation for when BASTE 1 enters/leaves */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
  margin-right: -0.5rem; /* Offsets the gap when hiding */
}

.card-outline {
  height: 100%;
  min-height: 0;
  max-height: 100%;
  background-color: #f2f2f20a;
  outline: 1px solid #f2f2f20d;
  box-shadow: 0 10px 80px #00000080;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
