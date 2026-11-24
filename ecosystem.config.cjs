/**
 * pm2 生产进程配置。
 *
 * 先在服务器上执行 `pnpm install && pnpm build`，
 * 再运行 `pm2 start ecosystem.config.cjs`。
 */
const ROOT = '/root/.nvm/xTool';

module.exports = {
  apps: [
    {
      name: 'xTool-server',
      script: 'pnpm',
      args: '--filter @xtool/server start',
      cwd: ROOT,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'xTool-mcp',
      script: 'pnpm',
      args: '--filter @xtool/mcp start',
      cwd: ROOT,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
    {
      name: 'xTool-chat-server',
      script: './.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 5298',
      cwd: `${ROOT}/chat-server`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
    },
  ],
};
