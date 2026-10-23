import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Permite abrir la app desde un túnel HTTPS de cloudflared.
  // Úsalo solo durante las prácticas.
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
})
