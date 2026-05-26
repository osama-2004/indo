import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base URL dynamically. Defaults to '/' (e.g. for local dev & Netlify).
const base = process.env.VITE_BASE_URL || '/';

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    include: ['react-is', 'recharts'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress react-is unresolved import warning — it is bundled by recharts
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.source === 'react-is') return;
        warn(warning);
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})