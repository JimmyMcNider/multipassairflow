import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Force fresh build - disable caching
    sourcemap: false,
    minify: true,
    // Generate new hash every time with timestamp
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  },
  // Disable all caching during development
  server: {
    force: true
  }
})