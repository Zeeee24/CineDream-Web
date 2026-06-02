import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function stripCrossorigin() {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/ crossorigin/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  base: '/CineDream-Web/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
