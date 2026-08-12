import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages 项目页部署在 /root-cause-analysis/ 子路径下，CI 构建时必须设置对应 base，
  // 否则资源路径指向域名根目录导致 404 白屏；本地开发/构建保持默认 '/'
  base: process.env.GITHUB_ACTIONS ? '/root-cause-analysis/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-form': ['react-hook-form'],
          'vendor-charts': ['recharts'],
          'vendor-flow': ['@xyflow/react'],
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
