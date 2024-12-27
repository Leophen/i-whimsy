import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
// import { vitePluginForArco } from '@arco-plugins/vite-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // vitePluginForArco({
    //   theme: '@arco-themes/react-s-theme',
    // }),
  ],
  server: {
    port: 8001,
  },
});
