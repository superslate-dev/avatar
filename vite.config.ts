import {resolve} from 'node:path'
import {defineConfig} from 'vite'

export default defineConfig({
  base: '/avatars/',
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
