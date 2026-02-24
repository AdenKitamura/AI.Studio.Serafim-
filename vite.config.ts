import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Приложение само обновится, если выйдет новая версия
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // любые статические файлы
      manifest: {
        id: "serafim-os-v4",
        name: "Serafim OS",
        short_name: "Serafim",
        description: "Digital Second Brain and AI Mentor",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      // Вот эта настройка - это сердце оффлайна
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Кэшируем ВСЁ
        cleanupOutdatedCaches: true, // Удаляем старый кэш, чтобы не забивать память телефона
        runtimeCaching: [
          {
            // Кэшируем запросы к внешним шрифтам (например, Google Fonts)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 год
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
