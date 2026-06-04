import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',     // 有新版本自动更新 Service Worker
      includeAssets: [
        'favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/icon-*.png',
      ],

      // ── Web App Manifest ─────────────────────────────
      manifest: {
        name:             '网球俱乐部经营',
        short_name:       '网球经营',
        description:      '网球俱乐部经营模拟游戏 — Tennis Club Manager',
        theme_color:      '#1c3a1a',
        background_color: '#1c3a1a',
        display:          'standalone',    // 全屏独立 App 模式，隐藏浏览器地址栏
        orientation:      'portrait',      // 竖屏优先
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
            purpose: 'any maskable',       // Android 自适应图标
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

      // ── Service Worker 缓存策略 ──────────────────────
      workbox: {
        // 预缓存所有构建产物（JS/CSS/HTML）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // 运行时缓存策略
        runtimeCaching: [
          {
            // API 请求：网络优先，失败时用缓存（5分钟有效）
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName:          'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 300,   // 5 分钟
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 图标/字体等静态资源：缓存优先
            urlPattern: /\.(png|jpg|svg|woff2|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries:    100,
                maxAgeSeconds: 30 * 24 * 60 * 60,  // 30 天
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

  // API 代理（开发模式用，Vercel 部署自动处理）
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
