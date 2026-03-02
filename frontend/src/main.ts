import { createApp, watch } from 'vue'
import './assets/css/main.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router';
import { useHostStore } from './stores/hostStore';

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const hostStore = useHostStore(pinia);
watch(
  () => hostStore.selectedHost?.id ?? null,
  (newId, oldId) => {
    if (newId === oldId || newId == null) return;
    if (router.currentRoute.value.name !== 'dashboard') {
      router.push({ name: 'dashboard' });
    }
  },
);

app.mount('#app')
