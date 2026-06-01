import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cinedream/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
