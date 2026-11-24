# xTool

xTool 是一个纯 Web 的个人效率工作台：记账、待办、聊天室、知识库、智能体编排与一组常用小工具。

项目已移除 Electron 桌面端，不再依赖 IPC、剪贴板历史、截图历史与全局快捷键；浏览器访问即可使用，所有页面均为 React。

## 技术栈

| 层                | 选型                                                        |
| ----------------- | ----------------------------------------------------------- |
| 包管理 / Monorepo | pnpm workspace                                              |
| Web               | React 18 + TypeScript + Vite + Tailwind CSS + Zustand       |
| 业务 API          | Node.js + Express + MySQL                                   |
| 实时聊天          | Python FastAPI + Socket.IO                                  |
| MCP               | TypeScript + `@modelcontextprotocol/sdk`（Streamable HTTP） |
| 质量              | ESLint 9 + Prettier + Vitest + `tsc --noEmit`               |

## 目录结构

```text
.
├─ apps/
│  ├─ web/                 # React Web 应用
│  │  └─ src/
│  │     ├─ app/           # 路由、守卫、主题副作用
│  │     ├─ features/      # 按领域拆分的页面（记账、待办、工具、聊天、设置）
│  │     └─ shared/        # 设计令牌、UI 组件、hooks、HTTP、store
│  ├─ server/              # Express 业务服务
│  └─ mcp/                 # MCP Streamable HTTP 服务
├─ packages/shared/        # 前后端共享的领域类型与常量
├─ chat-server/            # Python 实时聊天服务
├─ ai/                     # 个人 AI 实验代码，不参与 Web 构建
├─ pnpm-workspace.yaml
└─ ecosystem.config.cjs    # pm2 生产进程配置
```

## 环境要求

- Node.js >= 20.19
- pnpm 10（`corepack enable` 后会自动使用 `packageManager` 指定的版本）
- MySQL 8+
- Python 3.11+（仅聊天室 / 知识库需要）

## 安装与开发

```bash
pnpm install

# 启动 Web + 业务 API + MCP
pnpm dev

# 或分别启动
pnpm dev:web      # http://localhost:5199
pnpm dev:server   # http://localhost:5198
pnpm dev:mcp      # http://localhost:5197/mcp
pnpm start:chat-server  # http://localhost:5298
```

Web 开发服务器通过 Vite 代理访问后端：

- `/api` → `http://localhost:5198`
- `/chatServer` → `http://localhost:5298`（含 WebSocket）

## 环境变量

仓库不再提交任何真实 `.env` 或 `.mcp.json`。请复制示例文件后填写：

```bash
cp apps/server/.env.example apps/server/.env
cp apps/mcp/.env.example apps/mcp/.env
cp .mcp.json.example .mcp.json   # 可选：Cursor MCP 配置
```

业务服务常用变量：

```env
PORT=5198
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xtool_db
JWT_SECRET=change_me
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIRUI_LICENSE=
ANTHROPIC_API_KEY=
```

## 构建

```bash
pnpm build
```

构建产物：

- `apps/web/dist`：静态站点
- `apps/server/dist`：业务 API
- `apps/mcp/dist`：MCP 服务
- `packages/shared/dist`：共享类型

## 生产部署

### 静态站点与反向代理

Web 默认按以下路径请求后端（见 `apps/web/src/shared/lib/http.ts` 与 `features/chat/api.ts`）：

| 前端路径        | 转发到                                        |
| --------------- | --------------------------------------------- |
| `/server/api/*` | `http://127.0.0.1:5198/api/*`                 |
| `/chatServer/*` | `http://127.0.0.1:5298/*`（需支持 WebSocket） |

Nginx 示例：

```nginx
location /server/api/ {
  proxy_pass http://127.0.0.1:5198/api/;
  proxy_set_header Host $host;
}

location /chatServer/ {
  proxy_pass http://127.0.0.1:5298/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}

location / {
  root /var/www/html/xTool;
  try_files $uri $uri/ /index.html;
}
```

> React 使用 BrowserRouter，静态站点必须把未知路径回退到 `index.html`。

### pm2

```bash
pnpm build
pm2 start ecosystem.config.cjs
```

### 发布 Skill

生产服务器（`39.105.137.213`）的发布、巡检、重启、日志与回滚由项目内 skill 管理：

```bash
bash .dsh/skills/xtool-deploy/bin/xtool-deploy status
bash .dsh/skills/xtool-deploy/bin/xtool-deploy deploy
bash .dsh/skills/xtool-deploy/bin/xtool-deploy health
bash .dsh/skills/xtool-deploy/bin/xtool-deploy logs server --lines 100
bash .dsh/skills/xtool-deploy/bin/xtool-deploy rollback
```

凭据只保存在本机 `~/.config/xtool/deploy.env`（权限 600），不进入仓库；
变量说明与发布规则见 [skill 文档](.dsh/skills/xtool-deploy/SKILL.md)。

## 记账模块

- **自动设备检测**：`useIsMobile()` 基于 `matchMedia('(max-width: 767px)')`，首帧即确定视图，不闪屏。
- **PC 视图**：月份汇总、筛选/搜索、记录列表与右侧固定「记一笔」表单。
- **移动端视图**：紧凑汇总卡、横向筛选、记录卡片、底部安全区与悬浮「+」按钮，表单使用底部抽屉。
- **共用数据层**：API、筛选/分组/汇总逻辑、用途管理、附件预览在两端复用；单元测试覆盖筛选、分组、金额格式化与跨年月份。

## 页面

| 路径                                                                                         | 说明                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `/bookkeeping`                                                                               | 记账（PC / 移动端自动切换）          |
| `/todo`                                                                                      | 待办卡片与待办项                     |
| `/ai/chat`                                                                                   | 聊天室                               |
| `/ai/knowledge`                                                                              | 知识库上传                           |
| `/ai/orchestrator`                                                                           | 智能体流程编排                       |
| `/ai/code`                                                                                   | 代码助手                             |
| `/tools`                                                                                     | 工具索引                             |
| `/tools/json` `/tools/diff` `/tools/translate` `/tools/reader` `/tools/video` `/tools/stock` | 具体工具                             |
| `/settings`                                                                                  | 个人信息、外观、AI 服务密钥、MCP Key |

## 工程化命令

```bash
pnpm lint         # ESLint
pnpm format       # Prettier 写入
pnpm format:check # Prettier 校验
pnpm typecheck    # 所有 workspace 的 tsc --noEmit
pnpm test         # Vitest
pnpm verify       # 格式 + lint + 类型 + 测试 + 构建
```

## 已移除的桌面能力

- Electron 主进程 / preload / electron-builder 打包
- 剪贴板历史与剪贴板监听
- 截图历史、截图编辑器、拖拽截图
- 登录历史（原 IPC 存储）
- 全局快捷键与相关设置页面
- 本地数据 / 在线数据双模式（待办统一走服务端）

## 相关文档

- [业务 API](apps/server/README.md)
- [MCP 服务](apps/mcp/README.md)
- [聊天服务](chat-server/README.md)
