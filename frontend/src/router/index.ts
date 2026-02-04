import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "../layouts/DashboardLayout.vue";

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
    meta: { layout: DashboardLayout, willShowSavedHost: true },
  },
  {
    path: "/network-map",
    name: "network-map",
    component: () => import("../views/NetworkMapView.vue"),
    meta: { layout: DashboardLayout, willShowSavedHost: false },
  },
  {
    path: "/dashboard/tmux-manager",
    name: "tmux-manager",
    component: () => import("../views/TmuxView.vue"),
    meta: { layout: DashboardLayout, willShowSavedHost: false },
  },

];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
