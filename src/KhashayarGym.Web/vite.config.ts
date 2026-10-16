import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const API = process.env.API_URL ?? 'https://localhost:7180'

// در توسعه، /api به بک‌اند ASP.NET پراکسی می‌شود.
// در بیلد، خروجی مستقیم داخل wwwroot پروژهٔ Api قرار می‌گیرد.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // کامپوننت‌های 21st که برای Next.js نوشته شده‌اند
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/image': path.resolve(__dirname, './src/shims/next-image.tsx'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Origin هم به آدرس بک‌اند بازنویسی می‌شود تا بررسی هم‌مبدأ بودن refresh/logout در توسعه رد نشود
      '/api': { target: API, changeOrigin: true, secure: false, configure: (p) => p.on('proxyReq', (r) => { if (r.getHeader('origin')) r.setHeader('origin', API) }) },
      '/payment-sandbox': { target: API, changeOrigin: true, secure: false },
      '/hubs': { target: API, changeOrigin: true, secure: false, ws: true },
    },
  },
  build: {
    outDir: '../KhashayarGym.Api/wwwroot',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1100, // chunk نقشه (MapLibre) فقط هنگام دیده شدن نقشه بارگذاری می‌شود
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
