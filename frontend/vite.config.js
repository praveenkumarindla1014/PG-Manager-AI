import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies API and realtime traffic to the backend, so the app
// works from any host/port without CORS or hard-coded URLs.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, ws: true, changeOrigin: true }
    }
  }
})
