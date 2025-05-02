import { defineConfig, UserConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Base configuration used in all environments
  const config: UserConfig = {
    plugins: [
      tailwindcss(),
      inertia({ ssr: { enabled: true, entrypoint: 'app/core/ui/app/ssr.tsx' } }),
      react(),
      adonisjs({ entrypoints: ['app/core/ui/app/app.tsx'], reload: ['resources/views/**/*.edge'] }),
    ],

    /**
     * Define aliases for importing modules from
     * your frontend code
     */
    resolve: {
      alias: {
        '~/': `${getDirname(import.meta.url)}/app/core/ui/`,
      },
    },
  }

  // Add development-specific configuration
  if (mode === 'development') {
    config.server = {
      host: '0.0.0.0',
      hmr: {
        host: '0.0.0.0',
      },
      watch: {
        usePolling: true,
      },
      cors: true,
      allowedHosts: ['web', 'localhost', '127.0.0.1'],
    }
  }
  
  return config
})
