import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// در توسعه، /api به بک‌اند ASP.NET پراکسی می‌شود.
// در بیلد، خروجی مستقیم داخل wwwroot پروژهٔ Api قرار می‌گیرد.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_URL ?? 'https://localhost:7180', changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: '../KhashayarGym.Api/wwwroot',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1100, // chunk نقشه (MapLibre) فقط هنگام دیده شدن نقشه بارگذاری می‌شود
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'map'
          if (id.includes('gsap') || id.includes('lenis')) return 'motion'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
})
