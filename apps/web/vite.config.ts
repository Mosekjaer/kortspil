import { defineConfig, defaultClientConditions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app asks before reloading, so an update never lands mid-game.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon-64.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Fredagsbar Kortspil',
        short_name: 'Kortspil',
        description: 'Kort- og drikkespil til fredagsbaren. Spil på én telefon eller i et rum.',
        lang: 'da',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#13110f',
        theme_color: '#13110f',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/socket\.io/, /^\/healthz/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    // Consume @kortspil/core from TypeScript source; no prebuild needed.
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    host: true,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
})
