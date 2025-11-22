import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';




const __dirname: unknown = (() => {
  console.warn('__dirname stub - please implement based on usage context');
  return null;
})();export default defineConfig({ plugins: [react()], resolve: { alias: { '@': path.resolve(__dirname, './src') } }, build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  });