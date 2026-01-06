import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import FullScreenLayout from "../layouts/FullScreenLayout.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
    meta: { layout: DashboardLayout },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { layout: DashboardLayout },
  },
  {
    path:"/test",
    name:"test",
    component: () => import("../views/TestView.vue"),
    meta: { layout: FullScreenLayout },

  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
