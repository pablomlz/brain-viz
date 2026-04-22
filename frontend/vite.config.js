import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Necesario para Docker
    port: 5173,      // Puerto interno de Vite
    watch: {
      usePolling: true, // Vital para que el Hot-Reload funcione en algunos sistemas Linux/Windows
    },
  },
})