# chat-server

Python 聊天后端服务（FastAPI + Socket.IO + MySQL + LangGraph 插件骨架）。

该服务用于替换原 Node 聊天模块，当前聚焦聊天核心能力，不包含 MCP 适配逻辑。

## 功能概览

- 聊天 REST API
  - `GET /api/chat/messages`
  - `POST /api/chat/send`
  - `POST /api/chat/upload`
- Socket 实时通信
  - `chat:send`
  - `chat:new_message`
  - `chat:online_count`
  - `chat:error`
- 鉴权方式
  - JWT（`Bearer <token>`）
  - MCP Key（与原系统保持兼容，仅用于认证，不涉及 MCP 功能扩展）
- 消息协议
  - 支持 `text` / `image` / `file` / `link`
- Skill 扩展骨架
  - `SkillRegistry`
  - `SkillDispatcher`（默认不触发智能体流程）

## 工程化分层

服务已按成熟后端项目常见方式拆分为：

- `core`：配置、鉴权、安全相关
- `db`：数据库连接与会话管理
- `schemas`：Pydantic 数据模型（请求/响应/领域对象）
- `domain`：协议与领域规则（消息规范化）
- `repositories`：数据访问层
- `services`：业务编排层
- `api/routes`：HTTP 路由层
- `realtime`：Socket.IO 事件层
- `skills`：可插拔能力扩展层

## 目录结构

```text
chat-server/
  app/
    __init__.py
    main.py                 # ASGI 入口（uvicorn app.main:app）
    app_factory.py          # FastAPI 应用工厂
    core/
      settings.py           # 配置与环境变量
      security.py           # JWT / MCP Key 鉴权
    db/
      session.py            # MySQL 连接池
    schemas/
      chat.py               # Pydantic 模型
    domain/
      chat_protocol.py      # 消息协议规范化
    repositories/
      chat_repository.py    # 数据访问层
    services/
      chat_service.py       # 业务编排层
    api/
      routes/
        health.py           # 健康检查
        chat.py             # 聊天 REST API
    realtime/
      socket_server.py      # Socket.IO 事件
    skills/
      base.py           # Skill 接口定义
      registry.py       # Skill 注册表
      dispatcher.py     # Skill 调度器
  .env.example
  pyproject.toml
  requirements.txt
  README.md
```

## 环境要求

- Python 3.10+
- MySQL 8+
- 可访问项目主库（复用现有 `users` / `mcp_keys` / `chat_messages` 表）

## 安装与启动

在仓库根目录执行：

```bash
cd chat-server
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5298
```

健康检查：

```bash
curl http://localhost:5298/health
```

预期返回：

```json
{"status":"ok","message":"Python chat server is running"}
```

## 环境变量

推荐先复制配置模板：

```bash
cp .env.example .env
```

`app/core/settings.py` 支持以下变量（均有默认值）：

- `PY_CHAT_HOST`：服务监听地址，默认 `0.0.0.0`
- `PY_CHAT_PORT`：服务端口，默认 `5298`
- `PY_CHAT_CORS_ORIGIN`：CORS 允许源，默认 `*`
- `JWT_SECRET`：JWT 密钥（需与主系统一致）
- `DB_HOST`：数据库地址，默认 `localhost`
- `DB_PORT`：数据库端口，默认 `3306`
- `DB_USER`：数据库用户名，默认 `root`
- `DB_PASSWORD`：数据库密码，默认空
- `DB_NAME`：数据库名，默认 `xtool_db`
- `PY_CHAT_UPLOAD_DIR`：聊天上传目录，默认 `../server/uploads/chat`
- `PY_CHAT_PUBLIC_BASE_URL`：上传文件外网访问前缀，默认 `http://localhost:5298`
- `PY_CHAT_DEFAULT_ROOM`：默认聊天室，默认 `public`

## REST 接口

### 1) 获取历史消息

`GET /api/chat/messages`

Query 参数：

- `room_id`：默认 `public`
- `limit`：默认 `50`，最大 `200`
- `before_id`：分页游标（取更早消息）
- `all_rooms`：`1` 或 `true` 表示跨房间历史

返回：

```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "room_id": "public",
      "user_id": 2,
      "content_json": [{"type": "text", "text": "hello"}],
      "created_at": "2026-03-27T10:00:00",
      "username": "alice",
      "avatar": null
    }
  ]
}
```

### 2) 发送消息

`POST /api/chat/send`

请求体（两种方式）：

- 纯文本：`{ "text": "hi", "room_id": "public" }`
- 富文本：`{ "parts": [...], "room_id": "public" }`

失败时：

- 空消息：`400 { "error": "消息内容不能为空" }`
- 服务异常：`500 { "error": "发送失败" }`

### 3) 上传附件

`POST /api/chat/upload`

- Content-Type: `multipart/form-data`
- 字段：`file`

返回：

```json
{
  "success": true,
  "file": {
    "url": "http://localhost:5298/uploads/chat/xxxx.png",
    "name": "demo.png",
    "size": 12345,
    "mime_type": "image/png"
  }
}
```

## Socket 事件

连接地址：

- `http://localhost:5298`
- path：`/socket.io`
- auth：`{ token }` 或请求头 `Authorization: Bearer <token>`

事件：

- 客户端 -> 服务端
  - `chat:send`：`{ text?: string, roomId?: string, parts?: ChatMessagePart[] }`
- 服务端 -> 客户端
  - `chat:new_message`：`ChatMessage`
  - `chat:online_count`：`{ count: number }`
  - `chat:error`：`{ message: string }`

## Skill 扩展说明（骨架）

当前已提供插件机制基础结构，默认不会自动触发智能体流程：

- `app/skills/base.py`：定义 Skill 协议和执行上下文
- `app/skills/registry.py`：Skill 注册与查询
- `app/skills/dispatcher.py`：Skill 调度入口（预留 LangGraph 编排）

后续接入自研聊天智能体时，建议：

1. 新增 `skills/xxx_skill.py` 实现 Skill 协议
2. 在启动阶段注册到 `SkillRegistry`
3. 在 `app/services/chat_service.py` 中按策略触发 `dispatcher.dispatch(...)`

## 与 Node 聊天服务的关系

- 该服务用于替换原 Node 聊天模块。
- Node 主服务中的非聊天功能可继续运行。
- 启动编排由仓库根 `package.json` 的 `start:chat-server` / `start:all` 控制。

## 常见问题

1. **401 未授权**
   - 检查 `Authorization` 是否为 `Bearer <token>`
   - 确认 `JWT_SECRET` 与主系统一致
2. **上传成功但图片打不开**
   - 检查 `PY_CHAT_PUBLIC_BASE_URL`
   - 检查 `PY_CHAT_UPLOAD_DIR` 和文件权限
3. **收不到实时消息**
   - 检查 Socket 地址是否指向 `5298`
   - 检查 token 是否正确传递到 `auth.token`
