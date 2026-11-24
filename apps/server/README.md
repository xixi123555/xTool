# xTool 业务 API

Express + MySQL，提供认证、记账、待办、MCP Key、AI 服务密钥、视频转 GIF 与股票行情代理。聊天室由独立的 Python 服务提供。

## 能力

- 用户注册 / 密码登录 / 邮箱验证码登录 / 路人登录
- 记账记录、用途、附件（多人共享）
- 待办卡片与待办项
- AppKey 管理（翻译、网页阅读等 Dify 工作流）
- MCP Key 管理（只落库哈希，明文只返回一次）
- 应用配置（主题）
- 视频转 GIF（服务端 ffmpeg）
- 股票行情代理（授权码只在服务端）
- Claude 代码助手代理

## 环境变量

复制 `.env.example` 为 `.env`，至少配置数据库与 JWT：

```env
PORT=5198
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xtool_db
JWT_SECRET=change_me

# 邮箱验证码（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# 股票行情授权码（可选）
MAIRUI_LICENSE=

# Claude 代码助手（可选）
ANTHROPIC_API_KEY=
```

数据库表在服务启动时自动创建；记账默认用途「装修」会在首次启动时写入。

## 开发与构建

```bash
pnpm --filter @xtool/server dev
pnpm --filter @xtool/server build
pnpm --filter @xtool/server start
pnpm --filter @xtool/server typecheck
```

## API 概览

### 认证

| 方法 | 路径                      | 说明           |
| ---- | ------------------------- | -------------- |
| POST | `/api/auth/register`      | 注册           |
| POST | `/api/auth/login`         | 密码登录       |
| POST | `/api/auth/send-code`     | 发送邮箱验证码 |
| POST | `/api/auth/login-by-code` | 验证码登录     |
| POST | `/api/auth/guest`         | 路人登录       |
| GET  | `/api/auth/me`            | 当前用户       |
| PUT  | `/api/auth/profile`       | 更新资料       |

### 记账

| 方法       | 路径                                       | 说明            |
| ---------- | ------------------------------------------ | --------------- |
| GET        | `/api/bookkeeping/records`                 | 记录列表        |
| POST       | `/api/bookkeeping/records`                 | 新建记录        |
| PUT/DELETE | `/api/bookkeeping/records/:id`             | 更新 / 删除     |
| GET/POST   | `/api/bookkeeping/purposes`                | 用途列表 / 新增 |
| PUT/DELETE | `/api/bookkeeping/purposes/:id`            | 更新 / 删除用途 |
| PUT        | `/api/bookkeeping/purposes/:id/default`    | 设为默认        |
| GET/POST   | `/api/bookkeeping/records/:id/attachments` | 附件列表 / 上传 |
| DELETE     | `/api/bookkeeping/attachments/:id`         | 删除附件        |
| GET        | `/api/bookkeeping/attachments/:id/file`    | 下载附件        |

### 待办

| 方法       | 路径                                    |
| ---------- | --------------------------------------- |
| GET/POST   | `/api/todo/cards`                       |
| PUT/DELETE | `/api/todo/cards/:cardId`               |
| POST       | `/api/todo/items`                       |
| PUT/DELETE | `/api/todo/items/:itemId/cards/:cardId` |

### 设置与密钥

| 方法                | 路径                                              |
| ------------------- | ------------------------------------------------- |
| GET/PUT             | `/api/appsetting`（theme: light / dark / system） |
| GET/POST/PUT/DELETE | `/api/appkey/*`                                   |
| GET/POST/DELETE     | `/api/mcpkey/*`                                   |

### 其他

- `/api/video-to-gif/convert`：视频转 GIF
- `/api/stock/list|dividends/:code|prices/:code`：股票行情代理
- `/api/claude-code/messages`：Claude 流式代理

## 说明

- 不再提供快捷键相关接口；桌面端已移除。
- JWT 有效期为 7 天，过期后前端收到 401 会清理本地登录态并回到登录页。
- 上传文件保存在 `apps/server/uploads/`，该目录不进入版本库。
