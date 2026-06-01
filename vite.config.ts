import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // CORS'suz olarak İBB/İSPARK servislerine erişmek için dev proxy
      "/api/ibb": {
        target: "https://api.ibb.gov.tr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibb/, ""),
      },
      "/api/valhalla": {
        target: "http://localhost:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/valhalla/, ""),
      },
    },
  },
})
