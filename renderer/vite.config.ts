import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'child_process';

function checkPort(port) {
  try {
    // 检查端口是否被占用（Unix/Linux/Mac）
    execSync(`lsof -i:${port}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function killProcessOnPort(port) {
  try {
    // 获取占用端口的进程ID并杀死（Unix/Linux/Mac）
    const result = execSync(`lsof -ti:${port}`).toString().trim()
    if (result) {
      execSync(`kill -9 ${result}`)
      console.log(`已终止占用端口 ${port} 的进程: ${result}`)
    }
  } catch (error) {
    console.log(`端口 ${port} 未被占用或无法终止进程`)
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'kill-port-process',
      configureServer() {
        if (checkPort(5199)) {
          console.log(`端口 5199 被占用，尝试释放...`)
          killProcessOnPort(5199)
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5199,
    strictPort: true, // 端口被占用时直接失败，而不是尝试其他端口
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
