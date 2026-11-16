import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const backendTarget = env.VITE_API_TARGET || 'http://localhost:8081'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: Object.fromEntries(
        ['/auth', '/customers', '/balances', '/transactions', '/reports'].map((path) => [
          path,
          {
            target: backendTarget,
            changeOrigin: true,
            // Browser page navigation should reach Vite's SPA fallback. The same
            // paths are API endpoints for fetch/XHR requests expecting JSON.
            bypass: (request) => request.headers.accept?.includes('text/html') ? request.url : undefined,
          },
        ]),
      ),
    },
  }
})
