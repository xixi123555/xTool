---
name: xtool-deploy
description: 管理 xTool 生产服务器（39.105.137.213）的发布、巡检、重启、日志、健康检查与回滚。用户提到发布 xTool、上线、部署、重启生产服务、查看生产日志、回滚版本时使用。
whenToUse: 当用户要求把 xTool 发布到 39.105.137.213、查看生产状态、重启服务、看日志、做健康检查或回滚到某个提交时。
---

# xTool 生产发布

这台服务器的发布入口是当前项目里的 `.dsh/skills/xtool-deploy/bin/xtool-deploy`。所有远程操作都通过 SSH 完成，凭据从本机环境变量读取，不写入仓库。

## 先读这条

- **不要把密码写进命令、日志、提交或对话**。密码只保存在 `~/.config/xtool/deploy.env`（权限 600），由 `~/.zshrc` 自动加载；skill 也会在环境变量缺失时自行 source 这个文件。
- 发布前默认会执行本地 `pnpm verify`，并要求本地 `HEAD` 已推送到 `origin/main`。不满足就停止，不要用 `--skip-verify` 绕过验证，除非用户明确要求热修。
- `rollback`、`exec` 会改变生产状态；执行前先向用户确认目标，除非用户已经明确说“直接执行”。
- 不要把“命令已发出”说成“已发布成功”。以 `health` 输出和 `pm2 list` 为准。

## 快速命令

在项目根目录执行：

```bash
# 只读巡检：主机、git、pm2、端口、健康检查
bash .dsh/skills/xtool-deploy/bin/xtool-deploy status

# 发布：本地 verify → 服务器 git pull → pnpm install/build → 同步 web → pm2 reload → 健康检查
bash .dsh/skills/xtool-deploy/bin/xtool-deploy deploy

# 只做健康检查
bash .dsh/skills/xtool-deploy/bin/xtool-deploy health

# 重启
bash .dsh/skills/xtool-deploy/bin/xtool-deploy restart all
bash .dsh/skills/xtool-deploy/bin/xtool-deploy restart server

# 日志
bash .dsh/skills/xtool-deploy/bin/xtool-deploy logs server --lines 120
bash .dsh/skills/xtool-deploy/bin/xtool-deploy logs web --lines 80

# 回滚到上一个提交（会二次确认）
bash .dsh/skills/xtool-deploy/bin/xtool-deploy rollback

# 回滚到指定提交
bash .dsh/skills/xtool-deploy/bin/xtool-deploy rollback --to <commit> --yes

# 查看当前配置（不显示密码）
bash .dsh/skills/xtool-deploy/bin/xtool-deploy config
```

## 发布参数

| 参数              | 作用                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `--no-pull`       | 跳过服务器 git 拉取，直接构建服务器当前 checkout；只用于服务器访问 GitHub 失败或紧急热修 |
| `--skip-verify`   | 跳过本地 `pnpm verify`；仅限用户明确要求                                                 |
| `--chat-deps`     | 同时执行 `chat-server/.venv/bin/pip install -r chat-server/requirements.txt`             |
| `--reload-nginx`  | 构建后执行 `nginx -t && nginx -s reload`                                                 |
| `--branch <name>` | 覆盖部署分支，默认 `main`                                                                |

## 凭据与系统变量

首次配置或更换服务器时运行：

```bash
bash .dsh/skills/xtool-deploy/bin/xtool-deploy init
```

或手工写入 `~/.config/xtool/deploy.env`（权限必须是 600）：

```bash
export XTOOL_DEPLOY_HOST='39.105.137.213'
export XTOOL_DEPLOY_USER='root'
export XTOOL_DEPLOY_PASSWORD='...'
export XTOOL_DEPLOY_PORT='22'
```

可选变量：

```bash
export XTOOL_DEPLOY_ROOT='/root/.nvm/xTool'
export XTOOL_DEPLOY_WEB_ROOT='/var/www/html/xTool'
export XTOOL_DEPLOY_BRANCH='main'
export XTOOL_DEPLOY_REMOTE='origin'
export XTOOL_DEPLOY_PM2_CONFIG='ecosystem.config.cjs'
export XTOOL_DEPLOY_IDENTITY_FILE=''   # 配好后可改用密钥免密
export XTOOL_DEPLOY_REMOTE_ENV=''      # 远程命令额外环境变量，形如 KEY=value KEY2=value2
```

`~/.zshrc` 中已有自动加载：

```sh
[ -f "$HOME/.config/xtool/deploy.env" ] && . "$HOME/.config/xtool/deploy.env"
```

## 服务器布局

默认值，可通过环境变量覆盖：

| 项       | 值                                                 |
| -------- | -------------------------------------------------- |
| 仓库     | `/root/.nvm/xTool`                                 |
| 静态站   | `/var/www/html/xTool`                              |
| 业务 API | `5198`，`/health`                                  |
| 聊天服务 | `5298`，`/health`                                  |
| MCP      | `5197`，`/health`                                  |
| Web      | `http://39.105.137.213/`                           |
| pm2      | `xTool-server` / `xTool-mcp` / `xTool-chat-server` |

pm2 直接执行构建后的 `dist/index.js`，不依赖运行时 pnpm。发布后必须看到三个进程 `online`，并且三个 `/health` 与 Web 首页均返回 200。

## 发布流程（skill 已封装）

1. 本地 `pnpm verify`：Prettier、ESLint、类型检查、Vitest、构建。
2. 本地工作区必须干净，当前分支必须是 `main`，且 `HEAD == origin/main`。
3. SSH 到服务器，检查服务器 git 工作区没有已跟踪文件改动。
4. `git fetch + git pull --ff-only`。
5. `pnpm install --frozen-lockfile`。
6. `pnpm build`（shared → server → mcp → web）。
7. `rsync apps/web/dist/ → /var/www/html/xTool/`。
8. `pm2 startOrReload ecosystem.config.cjs --update-env` + `pm2 save`。
9. 健康检查；失败时自动打印最近 pm2 日志并非 0 退出。

## 排障

| 现象                                   | 处理                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ssh: connect ... Operation timed out` | 本机到服务器 22 端口被网络/云安全组拦截；检查安全组，或设置 `XTOOL_DEPLOY_PORT` 为实际 SSH 端口                      |
| 首次从旧目录结构升级                   | skill 会在 pull 前自动把 `server/.env`、`xtool-mcp/.env`、`server/uploads` 复制到 `apps/server`、`apps/mcp` 对应位置 |
| `Permission denied`                    | 检查 `XTOOL_DEPLOY_USER` / `XTOOL_DEPLOY_PASSWORD`；服务器是否禁用密码登录                                           |
| 服务器 `git pull` 失败                 | 服务器访问 GitHub 不稳定时可改走 `--no-pull`，或先在服务器修好 remote/凭据                                           |
| `pnpm: command not found`              | skill 会执行 `corepack enable`；若仍失败，先在服务器安装 Node 20+ 与 corepack                                        |
| 远程报 `node 未安装` / `pm2 未安装`    | 非登录 SSH shell 不加载 nvm，skill 已在每条远程命令前自动补 `~/.nvm/versions/node/*/bin` 到 PATH                     |
| `pnpm install` 卡在 `ffmpeg-static`    | 该包从 GitHub Releases 拉二进制，国内直连仅 20–30 KB/s；把 `XTOOL_DEPLOY_REMOTE_ENV` 设为官方支持的下载镜像变量即可  |
| `pm2` 进程 `errored`                   | `logs server --lines 120` 看堆栈；常见为 `.env` 缺失或数据库连不上                                                   |
| Web 200 但页面空白                     | 检查 `index.html` 回退规则、静态目录是否同步、浏览器控制台资源 404                                                   |
| 发布后 chat/mcp 不健康                 | 检查 `chat-server/.venv`、`apps/mcp/.env`、端口占用与 pm2 日志                                                       |

## 安全边界

- 所有远程命令以 `root` 执行；不要执行用户未明确要求的破坏性命令（`rm -rf`、数据库删除、`pm2 delete all`）。
- 不要在服务器上执行 `git reset --hard` 覆盖他人改动；skill 只做 `git pull --ff-only`，有冲突就停下。
- 回滚使用 detached HEAD，不修改服务器分支历史；下一次 `deploy` 会切回 `main`。
- 不把 `.env`、`.mcp.json`、密码、JWT 写入仓库或提交。
