# xTool MCP Server

xTool 的 MCP (Model Context Protocol) 服务，通过 **Streamable HTTP** 对外提供可远程访问的 MCP 端点，让 AI 客户端（Cursor、Claude Desktop 等）能够调用 xTool 的记账、待办、网页阅读等功能。

## 环境要求

- Node.js >= 18
- 已运行的 xTool Server（默认 `http://localhost:5198`）

## 安装

```bash
cd xtool-mcp
npm install
npm run build
```

## 配置

复制 `.env.example` 为 `.env` 并填入配置：

```env
# xTool Server 地址
XTOOL_SERVER_URL=http://localhost:5198

# MCP HTTP 服务端口（必填）
MCP_HTTP_PORT=5197

# MCP HTTP 监听地址（默认 0.0.0.0）
MCP_HTTP_HOST=0.0.0.0

# MCP HTTP 路由路径（默认 /mcp）
MCP_HTTP_PATH=/mcp

# 允许的 Host 列表（逗号分隔，公网部署时建议设置）
# MCP_ALLOWED_HOSTS=mcp.example.com,localhost

# MCP 鉴权 Token（可选后备，不配置时完全依赖请求头中的 Bearer）
XTOOL_JWT_TOKEN=<你的 mcp_key>

# Dify API Key（可选，网页阅读器专用）
DIFY_API_KEY=
```

### 获取 MCP Key

1. 使用非路人身份登录 xTool
2. 打开设置 -> 应用配置 -> 主题设置下方的 `MCP Key`
3. 点击生成并立即复制（明文只显示一次）

## 启动

```bash
# 开发模式（自动重新编译）
npm run dev

# 生产模式
npm run build
npm start
```

启动后 MCP 端点可通过 `http://<host>:<port>/mcp` 访问。

## 工具列表

| 工具名称 | 描述 |
|----------|------|
| `bookkeeping/add_expense` | 记一笔支出 |
| `bookkeeping/add_income` | 记一笔收入 |
| `bookkeeping/list_records` | 列出记账记录 |
| `bookkeeping/list_purposes` | 列出用途标签 |
| `todo/list_cards` | 列出待办卡片 |
| `todo/create_card` | 创建待办卡片 |
| `todo/create_item` | 在卡片下创建待办项 |
| `todo/update_item` | 更新待办项（含完成状态） |
| `web/read_page` | 读取网页正文内容 |

> 所有需要认证的操作（记账、待办、网页阅读）需要在请求中携带 Bearer token（mcp_key 或 JWT）。

## Cursor 配置

在 Cursor 的 MCP 设置中添加（Settings -> MCP -> Edit Config）：

```json
{
  "mcpServers": {
    "xtool": {
      "url": "http://localhost:5197/mcp",
      "headers": {
        "Authorization": "Bearer <你的 mcp_key>"
      }
    }
  }
}
```

远程部署时将 `localhost:5197` 替换为你的服务器地址。

## 部署

### 生产环境建议

1. 使用 PM2 或 systemd 管理进程：

```bash
pm2 start dist/index.js --name xtool-mcp
```

2. 使用 Nginx/Caddy 做 HTTPS 反代：

```nginx
server {
    listen 443 ssl;
    server_name mcp.example.com;

    location /mcp {
        proxy_pass http://127.0.0.1:5197;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

3. 配置环境变量 `MCP_ALLOWED_HOSTS=mcp.example.com` 以启用 Host 头校验。

### 安全注意事项

- **务必使用 HTTPS**：Bearer token 在 HTTP 明文传输中会被窃听。
- **限制访问来源**：通过 `MCP_ALLOWED_HOSTS` 和反代层防火墙限制。
- **Token 管理**：定期轮换 mcp_key，不再使用的及时删除。

## 健康检查

```bash
curl http://localhost:5197/health
# {"status":"ok","sessions":0}
```

## 日志

日志输出到 stderr，记录内容包括：

- **启动信息**：Server URL、端口、认证状态
- **工具调用**：工具名、入参、返回结果
- **API 请求**：HTTP 方法、路径、请求体
- **API 响应**：状态码、结果摘要

## 开发

```bash
npm run dev   # 监听并自动重新编译
npm run build # 构建
```
