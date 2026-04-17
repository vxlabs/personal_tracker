import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDesktopBuild = mode === 'desktop'

  return {
    base: isDesktopBuild ? './' : '/',
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(!isDesktopBuild
        ? [
            VitePWA({
              strategies: 'injectManifest',
              srcDir: 'src',
              filename: 'sw.ts',
              injectManifest: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
              },
              manifest: {
                name: 'Protocol',
                short_name: 'Protocol',
                description: 'Personal Tracking App',
                theme_color: '#0a0a0f',
                background_color: '#0a0a0f',
                display: 'standalone',
                icons: [
                  {
                    src: '/icon-192.svg',
                    sizes: '192x192',
                    type: 'image/svg+xml'
                  }
                ]
              },
              devOptions: {
                enabled: true,
                type: 'module',
                navigateFallback: 'index.html',
              },
            }),
          ]
        : []),
    ],
    build: {
      outDir: isDesktopBuild ? '../widget/dist/frontend' : 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
