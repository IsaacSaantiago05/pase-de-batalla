import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Codigo compartido entre las dos apps (packages/shared), importado como @shared/...
const sharedDir = fileURLToPath(new URL('../../packages/shared/src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@shared': sharedDir },
    // packages/shared no tiene node_modules: React e Iconify se resuelven desde la app.
    dedupe: ['react', 'react-dom', '@iconify/react'],
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), sharedDir] },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pase de Batalla',
        short_name: 'PaseApp',
        start_url: '/',
        display: 'standalone',
        background_color: '#080c18',
        theme_color: '#080c18',
        icons: [],
      },
    }),
  ],
})
