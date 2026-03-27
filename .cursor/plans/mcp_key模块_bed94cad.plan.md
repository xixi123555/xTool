---
name: mcp_key模块
overview: 在应用配置/主题设置下新增 MCP Key 模块：支持为非路人用户生成、永久有效、每人最多10个、可删除；后端新增数据库表与鉴权（Authorization Bearer <mcp_key> 可直接调用现有接口）；前端提供生成/列表/删除 UI，并指导将 .cursor/mcp.json 的 XTOOL_JWT_TOKEN 替换为 mcp_key。
todos:
  - id: db-mcpkey
    content: 在 `server/src/config/database.ts` 新增 `mcp_keys` 表；创建 `server/src/models/McpKey.ts`（hash 存储、最多10个、列表/删除/按 key 找 user）
    status: completed
  - id: routes-mcpkey
    content: 新增 `server/src/routes/mcpKey.ts`（/generate、/all、/delete），并在 `server/src/index.ts` 挂载
    status: completed
  - id: auth-mcpkey
    content: 扩展 `server/src/middleware/auth.ts`：JWT 失败时尝试把 token 当作 `mcp_key`（sha256 查库并设置 `req.user`）
    status: completed
  - id: renderer-api
    content: 新增 `renderer/src/api/mcpKey.ts`：generate/list/delete 调用
    status: completed
  - id: renderer-ui
    content: 在 `renderer/src/page/app-setting/AppSettingPanel.tsx` 主题设置下方添加 MCP Key 模块（建议拆子组件），支持生成/列表掩码/删除
    status: completed
  - id: docs-update
    content: 更新 `xtool-mcp/README.md` 与主 `README.md`：说明 `.cursor/mcp.json` 用 mcp_key 替换 `XTOOL_JWT_TOKEN`
    status: completed
  - id: manual-verify
    content: 按计划手动验证：生成/复制、调用记账、删除失效、每人最多10个
    status: completed
isProject: false
---

# MCP Key 模块执行计划

## 目标与数据流

- 前端在 `应用配置 -> 主题设置` 下展示 `MCP Key` 模块。
- 用户登录后生成 `mcp_key`（一次性明文展示/可复制），并在列表中仅展示掩码。
- 通过 `.cursor/mcp.json` 将 `XTOOL_JWT_TOKEN` 的值替换为 `mcp_key`，由 `xtool-mcp` 调用后端 API。
- 后端在鉴权中间件里同时支持：
  - JWT：原有 `Authorization: Bearer <jwt>`
  - MCP Key：`Authorization: Bearer <mcp_key>`（永久、可删除）

```mermaid
flowchart LR
  User[用户(非guest)] --> UI[MCP Key 模块(React)]
  UI --> Backend[新建 mcpkey 路由(Express)]
  Backend --> DB[(MySQL: mcp_keys 表)]

  Agent[Cursor/Claude] --> MCP[xtool-mcp (stdio)]
  MCP -->|Authorization: Bearer mcp_key| Auth[鉴权中间件 authenticate 扩展]
  Auth --> DB
  Auth --> Backend[现有业务路由(记账/网页阅读器等)]
```



## 1. 后端：数据库表与模型

1. 在 `server/src/config/database.ts` 的 `initDatabase()` 中新增表 `mcp_keys`（`IF NOT EXISTS`）：
  - `id` INT PK
  - `user_id` INT FK users
  - `key_hash` VARCHAR(64)（存 SHA-256 hash，明文不落库）
  - `key_hint`（如前6后4用于掩码展示，可选）
  - `created_at` TIMESTAMP
  - 索引：`idx_user_id`、`unique(key_hash)`（或 `(user_id,key_hash)`）
2. 新增模型 `server/src/models/McpKey.ts`，提供：
  - `createForUser(userId)`：
    - 查询当前 `userId` 的 key 数量，>=10 返回可读错误
    - 生成随机 `mcp_key`（32 bytes，base64url），计算 sha256 存 `key_hash`
    - 返回 `{ id, key: plaintext, mask }`（plaintext 仅返回一次）
  - `listByUserId(userId)`：返回 `{ id, mask, created_at }`
  - `deleteById(id,userId)`
  - `getUserByMcpKey(key)`：用于鉴权中间件按 hash 找到 user

## 2. 后端：新增 API 路由（给前端用）

1. 新增路由文件：`server/src/routes/mcpKey.ts`，并在 `server/src/index.ts` 中挂载：
  - `app.use('/api/mcpkey', mcpKeyRoutes)`
2. 路由设计（全部走现有 `authenticate` JWT 鉴权）：
  - `POST /generate`：生成一个 mcp_key（非guest）
  - `GET /all`：列出当前用户的 keys（掩码/创建时间/可删除）
  - `DELETE /delete/:id`：删除指定 key（校验属于当前用户）
3. 业务约束：
  - guest 用户：`403`（不允许生成/列表/删除）
  - 普通用户：最多 10 个 key

## 3. 后端：扩展鉴权中间件支持 mcp_key

1. 修改 `server/src/middleware/auth.ts`：在 JWT 校验失败时，尝试把 `Authorization Bearer` 的 token 当作 `mcp_key`：
  - 计算 sha256(token)
  - 调用 `McpKey.getUserByMcpKey()` 查到 user
  - 成功则设置 `req.user = user`，继续调用原业务逻辑
2. 注意保持兼容：JWT 仍按原逻辑工作。

## 4. 前端：新增 API 封装

1. 新增 `renderer/src/api/mcpKey.ts`：
  - `generateMcpKey()` -> `POST /mcpkey/generate`
  - `getAllMcpKeys()` -> `GET /mcpkey/all`
  - `deleteMcpKey(id)` -> `DELETE /mcpkey/delete/:id`
2. 复用现有 `renderer/src/utils/http.ts` 拦截器（自动带 `xtool_token` JWT）。

## 5. 前端：在 AppSettingPanel 加 UI 模块

1. 入口：在 `renderer/src/page/app-setting/AppSettingPanel.tsx` 的 `主题配置` 区域下方插入 MCP Key 模块。
2. UI 需求：
  - 仅对非 guest 用户显示（即使 tab 已隐藏，也要双保险；路由返回 403 时要展示错误信息）
  - 展示已生成 key 列表（掩码展示，例如 `****abcd` + 创建时间）
  - `生成 MCP Key` 按钮：调用生成 API
    - 成功后弹窗/卡片只显示明文一次（强调复制）
  - 每个 key 提供 `删除` 按钮
3. 为可维护性，建议把 UI 抽成子组件：
  - `renderer/src/page/app-setting/McpKeyPanel.tsx`（或 `components/mcpKey/`）

## 6. 文档与使用说明

1. 更新 `xtool-mcp/README.md` 与主 `README.md`（或新增小节），说明：
  - `.cursor/mcp.json` 中将 `XTOOL_JWT_TOKEN` 改为 `mcp_key`
  - 不再需要 JWT 到后端（JWT 仍用于登录/生成 key）

## 7. 手动验证步骤（上线前）

1. 登录非 guest 用户，进入设置 -> 应用配置 -> 主题设置下方：确认 MCP Key 模块可见。
2. 生成一个 key：确认明文只出现一次，列表中显示掩码。
3. 用 Cursor：将 `.cursor/mcp.json` 的 `XTOOL_JWT_TOKEN` 改成该 key，验证 xtool-mcp 能正常调用记账接口。
4. 删除 key 后：再次调用应返回 401。
5. 生成 11 个 key：确认第 11 个生成失败且错误提示明确。

