---
name: restart-server
description: 使用 Python 脚本重启项目服务，支持“全部服务”与“排除 electron 服务”两种模式。用户提到重启服务、重启后端、重启前后端联调环境、stop/start all 时使用。
version: 1.0.0
---

# Restart Server

## 用途

在项目根目录执行服务重启，流程固定为：

1. 先执行 `yarn stop:all`
2. 再按模式执行：
   - 排除 electron：`yarn start:all:except-electron`
   - 全部服务：`yarn start:all`

## 执行规则

- 必须通过 Python 执行，不直接手敲两条 yarn 命令。
- 优先使用脚本：`scripts/restart_services.py`
- 若任一命令失败，立即退出并返回非 0 退出码。

## 命令

在项目根目录运行：

```bash
# 默认：排除 electron
python3 .cursor/skills/restart-server/scripts/restart_services.py

# 启动全部服务
python3 .cursor/skills/restart-server/scripts/restart_services.py --mode all

# 显式指定排除 electron
python3 .cursor/skills/restart-server/scripts/restart_services.py --mode except-electron
```

## 触发词

- 重启服务
- 重启所有服务
- 重启（不含 electron）
- stop all 再 start all
- 联调环境重启
