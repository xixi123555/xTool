# xTool MCP Server

xTool 的 MCP (Model Context Protocol) 服务，让 AI 客户端（如 Cursor、Claude Desktop）能够调用 xTool 的记账、待办、网页阅读等功能。

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

# MCP 鉴权 Token（填 mcp_key；也兼容旧 JWT）
XTOOL_JWT_TOKEN=<你的 mcp_key>

# Dify API Key（可选，网页阅读器。不配置时若已登录，会尝试从 appkey 获取 web_reader）
DIFY_API_KEY=
```

### 获取 MCP Key

1. 使用非路人身份登录 xTool
2. 打开设置 -> 应用配置 -> 主题设置下方的 `MCP Key`
3. 点击生成并立即复制（明文只显示一次）

将复制得到的 `mcp_key` 填入环境变量 `XTOOL_JWT_TOKEN`（即作为鉴权 Bearer token 使用）。

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

> 记账、待办工具需要配置 `XTOOL_JWT_TOKEN`（填 mcp_key）后才会注册。
> 网页阅读器需要 `DIFY_API_KEY` 或已登录并配置 web_reader appKey。

## Cursor 配置

在 Cursor 的 MCP 设置中添加（Settings -> MCP -> Edit Config）：

```json
{
  "mcpServers": {
    "xtool": {
      "command": "node",
      "args": ["/Users/你的用户名/Desktop/knife/xtool-mcp/dist/index.js"],
      "env": {
        "XTOOL_SERVER_URL": "http://localhost:5198",
        "XTOOL_JWT_TOKEN": "<你的 mcp_key>"
      }
    }
  }
}
```

将 `args` 中的路径改为本机 `xtool-mcp` 的实际路径。

## 日志

日志输出到 stderr，不会干扰 MCP 协议（stdin/stdout）。记录内容包括：

- **启动信息**：Server URL、认证状态
- **工具调用**：工具名、入参、返回结果
- **API 请求**：HTTP 方法、路径、请求体
- **API 响应**：状态码、结果摘要

在 Cursor 中查看：MCP 日志通常显示在 Cursor 的 MCP 输出面板或终端中。

## 开发

```bash
npm run dev   # 监听并自动重新编译
npm run build # 构建
```
