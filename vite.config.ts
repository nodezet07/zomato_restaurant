import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const renderHosts = ['zomato-restaurant-ychb.onrender.com', '.onrender.com'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
    strictPort: true,
    allowedHosts: renderHosts,
  },
  preview: {
    host: true,
    allowedHosts: renderHosts,
  },
});
