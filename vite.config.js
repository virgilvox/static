import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Static client-only build. Output lands in dist/ for DigitalOcean App Platform.
export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
