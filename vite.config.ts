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
    // 防双 React：@shared/core 源码位于父目录，其自身 node_modules 里有 npm 自动安装的 react 副本，
    // 不 dedupe 会导致 production bundle 出现两份 React，hooks dispatcher 为 null 而白屏
    // （dev 因依赖预打包不受影响，typecheck/build 也不报错）。
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-hook-form'],
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
