import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load root env
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  // Auto-expose all VITE_ variables
  const exposedEnv = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith("VITE_"))
      .map(([key, val]) => [`import.meta.env.${key}`, JSON.stringify(val)])
  );

  return {
    plugins: [vue(), tailwindcss()],
    define: exposedEnv,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      // This is required for the vite dev server to proxy api requests to the backend
      proxy: {
        '/api': {
          target: 'http://konek-backend:3000',
          changeOrigin: true,
        }
      }
    }
  };
  
});
