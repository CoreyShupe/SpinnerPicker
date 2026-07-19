import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite config. Host/port come from env (FRONTEND_HOST/FRONTEND_PORT) so nothing
 * is hard-coded. The API base URL is read in the app via import.meta.env.VITE_API_URL.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const host = env.FRONTEND_HOST || '127.0.0.1';
  const port = Number(env.FRONTEND_PORT || 5173);

  return {
    plugins: [react()],
    server: { host, port, strictPort: false },
    preview: { host, port },
  };
});
