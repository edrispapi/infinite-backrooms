/* @ts-nocheck */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig(() => {
  // Determine host/port with the following priority:
  // 1) FORCE_DEV_HOST / FORCE_DEV_PORT
  // 2) VITE_HOST / VITE_PORT
  // 3) HOST / PORT
  // 4) defaults (0.0.0.0 / 8001)
  const defaultHost = '0.0.0.0';
  const defaultPort = 8001;
  // Use import.meta.env or process.env safely
  const env = typeof process !== 'undefined' ? process.env : {};
  const host = env.FORCE_DEV_HOST || env.VITE_HOST || env.HOST || defaultHost;
  const rawPort = env.FORCE_DEV_PORT || env.VITE_PORT || env.PORT;
  const port = rawPort ? Number(rawPort) || defaultPort : defaultPort;
  // Emit enforced values at config evaluation time for debugging / sandbox logs
  // (keeps behavior explicit even when CLI flags may attempt to override)
  // eslint-disable-next-line no-console
  console.log(`[vite.config] Enforced dev/preview host=${host} port=${port}`);
  return {
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
      host,
      port,
      strictPort: true,
      // Ensure HMR uses same host/port for sandbox / proxy compatibility
      hmr: {
        host,
        port,
        clientPort: port,
      },
    },
    preview: {
      host,
      port,
      strictPort: true,
    },
  };
});