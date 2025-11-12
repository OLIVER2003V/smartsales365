import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      workbox: {
        // 1. Archivos de la App (Cascarón)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webp,woff,woff2}'],

        // 2. REGLA DE SPA (La que faltaba en tu build)
        // Para que F5 (refrescar) funcione offline en rutas como /usuarios
        navigateFallback: '/index.html',

        // 3. REGLA DE API (Para los datos)
        runtimeCaching: [
          {
            // Intercepta peticiones a tu backend local Y de producción
            urlPattern: ({ url }) => {
              const isLocalApi = url.href.startsWith('http://localhost:8000');
              const isProductionApi = url.href.startsWith('https://smartsales365-6vm6.onrender.com');
              return isLocalApi || isProductionApi;
            },
            
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30,
                maxEntries: 100,
              },
            },
          },
        ],
      },

      manifest: {
        // ... (tu manifest está bien)
        name: 'ElectroVentas (SmartSalesF65)',
        short_name: 'ElectroVentas',
        description: 'Sistema Comercial de Ventas de Electrodomésticos',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})