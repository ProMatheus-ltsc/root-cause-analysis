import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? '/root-cause-analysis/' : '/',
  resolve: {
    alias: {
      '@shared/core': path.resolve(__dirname, '../shared-core/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/react-hook-form')) {
            return 'vendor-form'
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/@xyflow')) {
            return 'vendor-flow'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
})
