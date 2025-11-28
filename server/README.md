# xTool Server

xTool 后端服务器，基于 Node.js + Express + MySQL。

## 功能

- 用户认证（登录、注册、路人登录）
- AppKey 管理（存储 Dify 工作流的 API Key）
- 权限控制（路人用户无法使用翻译和网页阅读器）

## 安装

```bash
cd server
npm install
```

## 配置

1. 复制 `.env.example` 为 `.env`（如果文件不存在，手动创建）
2. 配置数据库和 JWT Secret：

```env
PORT=5198
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=xtool_db
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

## 数据库设置

1. 创建 MySQL 数据库：
```sql
CREATE DATABASE xtool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 启动服务器后，表会自动创建

## 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 接口

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/guest` - 路人身份登录
- `GET /api/auth/me` - 获取当前用户信息

### AppKey 接口（需要认证）

- `POST /api/appkey/save` - 保存/更新 AppKey
- `GET /api/appkey/get/:workflowType` - 获取 AppKey
- `GET /api/appkey/all` - 获取所有 AppKeys

## 使用说明

1. 启动服务器
2. 在前端注册或登录
3. 登录后，可以通过 API 保存你的 Dify AppKey
4. 路人用户无法使用翻译和网页阅读器功能

