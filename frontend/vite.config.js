import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // "Same-origin" transport: the browser talks to :5173 and Vite forwards /api to the backend,
    // so cookies behave exactly like a same-origin deployment (no CORS involved).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
