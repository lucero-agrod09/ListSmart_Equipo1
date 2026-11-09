
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// ==========================================
// LISTSMART - CONFIGURACIÓN VITE Y PWA
// ==========================================

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // Actualización automática del Service Worker
      registerType: 'autoUpdate',

      // Archivos adicionales
      includeAssets: [
        'favicon.ico',
        'logo.svg',
        'apple-touch-icon-180x180.png',
      ],

      // ======================================
      // MANIFEST DE LISTSMART
      // ======================================
      manifest: {
        id: '/',

        name: 'ListSmart - Mi Lista',
        short_name: 'ListSmart',

        description:
          'Organiza tus listas de compras, productos, pendientes y recordatorios de manera fácil y rápida.',

        lang: 'es-MX',

        // Instalación de la aplicación
        start_url: '/',
        scope: '/',
        display: 'standalone',

        // Colores oficiales
        theme_color: '#168af0',
        background_color: '#f4f7fb',

        // ======================================
        // ICONOS PRINCIPALES
        // ======================================
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // ======================================
        // ACCESOS DIRECTOS CON ICONOS
        // ======================================
        shortcuts: [
          {
            name: 'Mis listas',
            short_name: 'Listas',
            description: 'Consultar mis listas de ListSmart',
            url: '/listas',
            icons: [
              {
                src: '/shortcut-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Nueva lista',
            short_name: 'Crear lista',
            description: 'Crear una nueva lista',
            url: '/nueva-lista',
            icons: [
              {
                src: '/shortcut-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Notificaciones',
            short_name: 'Avisos',
            description: 'Consultar notificaciones de ListSmart',
            url: '/notificaciones',
            icons: [
              {
                src: '/shortcut-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
        ],

        // ======================================
        // CAPTURAS PARA INSTALACIÓN PWA
        // ======================================
        screenshots: [
          {
            src: '/screenshots/escritorio.png',
            sizes: '1918x876',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Inicio de ListSmart en computadora',
          },
          {
            src: '/screenshots/movil.png',
            sizes: '603x870',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Inicio de ListSmart en celular',
          },
        ],
      },
    }),
  ],

  // ======================================
  // CONFIGURACIÓN CLOUDFLARE TUNNEL
  // ======================================
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },

  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
