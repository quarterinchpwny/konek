import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import { useHostStore } from "../stores/hostStore";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
    meta: { layout: DashboardLayout, willShowSavedHost: false },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { layout: DashboardLayout, requiresHost: true, willShowSavedHost: true },
  },
  {
    path: "/network-map",
    name: "network-map",
    component: () => import("../views/NetworkMapView.vue"),
    meta: { layout: DashboardLayout, requiresHost: true, willShowSavedHost: false },
  },
  {
    path: "/dashboard/tmux-manager",
    name: "tmux-manager",
    component: () => import("../views/TmuxView.vue"),
    meta: { layout: DashboardLayout, requiresHost: true, willShowSavedHost: true },
  },

];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const hostStore = useHostStore();
  
  if (to.meta.requiresHost && !hostStore.selectedHost) {
    next({ name: "home" });
  } else if (to.name === "home" && hostStore.selectedHost && from.name === undefined) {
    // If opening the app and we already have a host, go to dashboard
    next({ name: "dashboard" });
  } else {
    next();
  }
});

export default router;
