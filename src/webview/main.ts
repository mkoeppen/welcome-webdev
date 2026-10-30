import { createApp } from 'vue';
import App from './App.vue';
import { init } from './store';
import './styles/main.scss';

if (import.meta.env.DEV) await import('./styles/dev-theme.scss');

createApp(App).mount('#app');
init();
