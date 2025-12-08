module.exports = {
  apps : [{
    name: 'xTool-server',
    script: 'npm',           // 使用 npm
    args: 'run start:server',       // npm 参数
    cwd: '/root/.nvm/xTool',  // 项目路径
    instances: 1,            // 实例数（1 或 max）
    autorestart: true,       // 自动重启
    watch: false,            // 是否监听文件变化
    max_memory_restart: '1G', // 内存超过 1G 重启
  }],
};
