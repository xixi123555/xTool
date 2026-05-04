# AI 智能助手前端

基于 Vue 3 + Vite 构建的 AI 对话与文件上传前端项目。

## 功能

- **AI 对话**：微信风格聊天界面，与 AI 智能体实时对话（当前为 mock 数据）
- **文件上传**：支持拖拽/点击上传 `.txt` 文本文件，查看文件列表和上传状态

## 技术栈

- Vue 3 (Composition API + `<script setup>`)
- Vue Router 4
- Vite 6

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── router/
    │   └── index.js
    └── views/
        ├── Upload.vue      # 文件上传页面
        └── Chat.vue         # AI 对话页面
```

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 重定向 | 默认跳转 `/chat` |
| `/chat` | AI 对话 | 聊天页面 |
| `/upload` | 文件上传 | 上传文本文件 |
