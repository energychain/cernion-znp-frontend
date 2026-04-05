import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    allowedHosts: ['znp.corrently.io'],
    proxy: {
      '/api': {
        target: 'http://10.0.0.8:3900',
        changeOrigin: true
      }
    }
  }
})