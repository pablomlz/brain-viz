import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Necesario para Docker
    port: 5173,      // Puerto interno de Vite
    watch: {
      usePolling: true, // Vital para que el Hot-Reload funcione en Docker (incluyendo macOS)
      interval: 300,
    },
    // Proxy: redirige /api y /health al backend dentro de la red Docker
    // El navegador solo habla con el frontend; Vite reenvía internamente
    proxy: {
      '/api': 'http://backend:5000',
      '/health': 'http://backend:5000',
    },
  },
})