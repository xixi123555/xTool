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
    // 方法1: 使用 lsof 获取进程ID（优先使用 TCP:LISTEN）
    try {
      const result = execSync(`lsof -ti:${port} -s TCP:LISTEN`, { encoding: 'utf-8' }).trim()
      if (result) {
        const pids = result.split('\n').filter(pid => pid.trim())
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`已终止占用端口 ${port} 的进程: ${pid}`)
          } catch (err) {
            // 进程可能已经不存在，忽略错误
          }
        }
        return
      }
    } catch (err) {
      // 如果 TCP:LISTEN 失败，尝试不指定状态
    }

    // 方法2: 不指定 TCP 状态，获取所有占用端口的进程
    try {
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim()
      if (result) {
        const pids = result.split('\n').filter(pid => pid.trim())
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`已终止占用端口 ${port} 的进程: ${pid}`)
          } catch (err) {
            // 进程可能已经不存在，忽略错误
          }
        }
        return
      }
    } catch (err) {
      // 如果 lsof 失败，尝试使用 netstat (macOS/Linux)
    }

    // 方法3: 使用 netstat 和 awk (macOS/Linux)
    try {
      const result = execSync(`netstat -vanp tcp | grep ${port} | grep LISTEN | awk '{print $9}'`, { encoding: 'utf-8' }).trim()
      if (result) {
        const pids = result.split('\n').filter(pid => pid.trim())
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`已终止占用端口 ${port} 的进程: ${pid}`)
          } catch (err) {
            // 进程可能已经不存在，忽略错误
          }
        }
        return
      }
    } catch (err) {
      // netstat 可能不可用或命令格式不对，忽略
    }

    // 方法4: 使用 pkill (如果可用)
    try {
      execSync(`pkill -f ".*:${port}.*"`, { stdio: 'ignore' })
      console.log(`尝试使用 pkill 终止占用端口 ${port} 的进程`)
    } catch (err) {
      // pkill 可能失败，忽略
    }
  } catch (error: any) {
    // 所有方法都失败时的提示
    console.log(`无法自动终止占用端口 ${port} 的进程`)
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
        // 如果端口仍未释放，尝试多次强制终止
        console.log(`端口 ${port} 在 ${maxAttempts} 次尝试后仍未释放，尝试强制终止...`)
        // 尝试多次终止
        for (let i = 0; i < 3; i++) {
          killProcessOnPort(port)
          // 短暂等待
          try {
            execSync('sleep 0.2', { stdio: 'ignore' })
          } catch {}
        }
        // 再等待一次
        setTimeout(() => {
          if (!checkPort(port)) {
            resolve(undefined)
          } else {
            // 最后尝试一次，如果还是失败，提供更详细的错误信息
            console.error(`\n端口 ${port} 无法释放，请手动执行以下命令：`)
            console.error(`  lsof -ti:${port} | xargs kill -9`)
            console.error(`或者：`)
            console.error(`  lsof -i:${port}`)
            console.error(`然后手动终止显示的进程\n`)
            reject(new Error(`端口 ${port} 在 ${maxAttempts} 次尝试后仍未释放`))
          }
        }, delay * 2)
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
          // 先尝试终止进程
          killProcessOnPort(5199)
          // 等待端口真正释放
          try {
            await waitForPortRelease(5199, 15, 500)
            console.log(`端口 5199 已成功释放`)
          } catch (error: any) {
            // 如果仍然无法释放，尝试最后一次强制终止
            console.log(`\n尝试最后一次强制终止...`)
            killProcessOnPort(5199)
            // 再等待 2 秒
            await new Promise(resolve => setTimeout(resolve, 2000))
            if (checkPort(5199)) {
              console.error(`\n❌ 无法自动释放端口 5199`)
              console.error(`请手动执行以下命令之一：`)
              console.error(`  1. lsof -ti:5199 | xargs kill -9`)
              console.error(`  2. lsof -i:5199  # 查看占用进程，然后手动终止`)
              console.error(`\n或者修改 renderer/vite.config.ts 中的端口号\n`)
              throw error
            } else {
              console.log(`端口 5199 已成功释放`)
            }
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
