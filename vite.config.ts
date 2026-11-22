import {resolve} from 'node:path'
import {defineConfig} from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname, 'studio'),
  publicDir: resolve(import.meta.dirname, 'studio/public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist-studio'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
