import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const API = process.env.API_URL ?? 'https://localhost:7180'

// In der Entwicklung wird /api an das ASP.NET-Backend weitergeleitet.
// Beim Build landet die Ausgabe direkt in wwwroot des Api-Projekts.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 21st-Komponenten, die für Next.js geschrieben wurden
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/image': path.resolve(__dirname, './src/shims/next-image.tsx'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Auch Origin wird auf die Backend-Adresse umgeschrieben, damit die Same-Origin-Prüfung von refresh/logout in der Entwicklung nicht scheitert
      '/api': { target: API, changeOrigin: true, secure: false, configure: (p) => p.on('proxyReq', (r) => { if (r.getHeader('origin')) r.setHeader('origin', API) }) },
      '/payment-sandbox': { target: API, changeOrigin: true, secure: false },
      '/hubs': { target: API, changeOrigin: true, secure: false, ws: true },
    },
  },
  build: {
    outDir: '../GymPlatform.Api/wwwroot',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1100, // der Karten-Chunk (MapLibre) wird erst geladen, wenn die Karte sichtbar wird
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('gsap') || id.includes('lenis')) return 'motion'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
})
