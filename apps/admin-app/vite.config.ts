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
        name: 'Pase de Batalla Admin',
        short_name: 'PaseAdmin',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [],
      },
    }),
  ],
})
