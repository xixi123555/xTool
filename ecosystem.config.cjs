/**
 * pm2 生产进程配置。
 *
 * 进程直接执行构建后的 dist，不再依赖运行时的 pnpm，
 * 避免 pm2 daemon 的 PATH 与登录 shell 不一致导致启动失败。
 */
const ROOT = '/root/.nvm/xTool';

module.exports = {
  apps: [
    {
      name: 'xTool-server',
      script: `${ROOT}/apps/server/dist/index.js`,
      cwd: `${ROOT}/apps/server`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'xTool-mcp',
      script: `${ROOT}/apps/mcp/dist/index.js`,
      cwd: `${ROOT}/apps/mcp`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
    {
      name: 'xTool-chat-server',
      script: `${ROOT}/chat-server/.venv/bin/uvicorn`,
      args: 'app.main:app --host 0.0.0.0 --port 5298',
      cwd: `${ROOT}/chat-server`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
    },
  ],
};
