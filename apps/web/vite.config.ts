import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * 开发环境统一通过 Vite 代理访问后端：
 * - /api        -> 5198（Node 业务服务）
 * - /chatServer -> 5298（Python 聊天服务，含 WebSocket）
 *
 * 生产环境由反向代理提供同路径，因此前端不感知部署地址。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@xtool/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5198',
        changeOrigin: true,
      },
      '/chatServer': {
        target: 'http://localhost:5298',
        changeOrigin: true,
        ws: true,
        rewrite: (requestPath) => requestPath.replace(/^\/chatServer/, ''),
      },
    },
  },
  preview: {
    port: 5199,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
