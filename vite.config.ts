import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  const backendProxy = process.env.VITE_BACKEND_PROXY || 'http://127.0.0.1:8000';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDirectory, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': { target: backendProxy, changeOrigin: false },
        '/admin': { target: backendProxy, changeOrigin: false },
        '/static': { target: backendProxy, changeOrigin: false },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'motion-vendor': ['motion/react'],
            'icons-vendor': ['lucide-react'],
          },
        },
      },
    },
  };
});
