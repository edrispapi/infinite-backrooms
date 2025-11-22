/* @ts-nocheck */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'public',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 8001,
    strictPort: true,
    hmr: { host: '0.0.0.0' },
  },
  preview: {
    host: '0.0.0.0',
    port: 8001,
    strictPort: true,
  },
});