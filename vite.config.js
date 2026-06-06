import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/icon-*.png',
      ],

      manifest: {
        name:             '网球俱乐部经营',
        short_name:       '网球经营',
        description:      '网球俱乐部经营模拟游戏 — Tennis Club Manager',
        theme_color:      '#1c3a1a',
        background_color: '#1c3a1a',
        display:          'standalone',
        orientation:      'portrait',
        scope:            '/',
        start_url:        '/',
        icons: [
          { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          {
            src:     'icons/icon-192x192.png',
            sizes:   '192x192',
            type:    'image/png',
            purpose: 'any maskable',
          },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          {
            src:     'icons/icon-512x512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // 预缓存所有构建产物
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // ✅ 关键：明确排除 /api/ 路径，不允许 Service Worker 缓存或拦截
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          // ✅ 删除了原来的 API 缓存策略，API 请求完全不经过 Service Worker
          {
            // 图标/字体等静态资源：缓存优先
            urlPattern: /\.(png|jpg|svg|woff2|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries:    100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            // CDN 字体（Tabler Icons）：缓存优先
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries:    20,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
