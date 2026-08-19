import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['seal.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'True Docs Pro',
        short_name: 'True Docs Pro',
        description: 'Notary, apostille, and embassy legalization — submit, track, and pay for documents from your phone.',
        theme_color: '#0F1B33',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/portal',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/portal\/orders\/.*$/],
      },
    }),
  ],
})
