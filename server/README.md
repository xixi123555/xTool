# xTool Server

xTool 后端服务器

## 功能特性

- 用户注册/登录
- 邮箱验证码登录
- 路人身份登录
- AppKey 管理
- 快捷键管理

## 环境配置

在项目根目录创建 `.env` 文件，配置以下环境变量：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=xtool_db

# JWT 密钥
JWT_SECRET=your_jwt_secret_key

# 服务器端口
PORT=5198

# SMTP 邮件配置（用于发送验证码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@qq.com
SMTP_PASS=your_email_auth_code
```

### 邮件服务配置说明

#### QQ 邮箱配置

1. 登录 QQ 邮箱
2. 进入"设置" -> "账户"
3. 开启"POP3/SMTP服务"或"IMAP/SMTP服务"
4. 生成授权码（`SMTP_PASS`）
5. 配置 `.env` 文件：
   ```env
   SMTP_HOST=smtp.qq.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_qq_email@qq.com
   SMTP_PASS=your_auth_code
   ```

#### 其他邮箱服务商配置

- **Gmail**: 
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`
  - 需要应用专用密码

- **163 邮箱**:
  - `SMTP_HOST=smtp.163.com`
  - `SMTP_PORT=465`
  - `SMTP_SECURE=true`

- **Outlook**:
  - `SMTP_HOST=smtp.office365.com`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`

## 安装依赖

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

## 生产运行

```bash
npm start
```

## API 接口

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 密码登录
- `POST /api/auth/login-by-code` - 验证码登录
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/guest` - 路人身份登录
- `GET /api/auth/me` - 获取当前用户信息

### AppKey 管理

- `POST /api/appkey/save` - 保存/更新 AppKey
- `GET /api/appkey/get/:keyName` - 根据 keyName 获取 AppKey
- `GET /api/appkey/all` - 获取所有 AppKey
- `PUT /api/appkey/update/:id` - 更新 AppKey
- `DELETE /api/appkey/delete/:id` - 删除 AppKey

### 快捷键管理

- `GET /api/shortcut/all` - 获取所有自定义快捷键
- `POST /api/shortcut/save` - 保存/更新快捷键
- `DELETE /api/shortcut/delete/:actionName` - 删除快捷键
