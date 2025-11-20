import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'child_process';

function checkPort(port: number): boolean {
  try {
    // 检查端口是否被占用（Unix/Linux/Mac）
    execSync(`lsof -i:${port}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function killProcessOnPort(port: number): void {
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

function waitForPortRelease(port: number, maxAttempts: number = 10, delay: number = 400): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let attempts = 0
    const check = () => {
      attempts++
      if (!checkPort(port)) {
        resolve(undefined)
        return
      }
      if (attempts >= maxAttempts) {
        reject(new Error(`端口 ${port} 在 ${maxAttempts} 次尝试后仍未释放`))
        return
      }
      setTimeout(check, delay)
    }
    check()
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'kill-port-process',
      async configureServer(server) {
        if (checkPort(5199)) {
          console.log(`端口 5199 被占用，尝试释放...`)
          killProcessOnPort(5199)
          // 等待端口真正释放
          try {
            await waitForPortRelease(5199, 30)
            console.log(`端口 5199 已成功释放`)
          } catch (error) {
            console.warn(`警告: ${error.message}`)
          }
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
