import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'spa',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    fs: { strict: false },
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:3000',
      '/socket.io': {
        target: process.env.API_URL || 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
