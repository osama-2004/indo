import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use '/' for local dev, '/IndusConnect-/' for GitHub Pages production build
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProd ? '/IndusConnect-/' : '/',
  plugins: [react()],
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