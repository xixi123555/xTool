# Python 聊天后端重构计划（不含 MCP）

## 任务目标

- 将聊天模块后端从 Node.js 重构为 Python 服务，并放入 `chat-server` 目录。
- 保留核心能力：历史消息、实时推送、图片/文件上传、在线人数、鉴权。
- 使用 Python + LangGraph 技术栈，落地可插拔 Skill 扩展骨架（本期不接入聊天机器人，不做 MCP）。
- 在不影响当前聊天页面使用的前提下完成服务替换与验证。

## 涉及文件清单

- Node 现有聊天模块（迁移参考与下线对象）
  - `/Users/tangxixi/Desktop/knife/server/src/routes/chat.ts`
  - `/Users/tangxixi/Desktop/knife/server/src/realtime/chatGateway.ts`
  - `/Users/tangxixi/Desktop/knife/server/src/service/chatService.ts`
  - `/Users/tangxixi/Desktop/knife/server/src/models/ChatMessage.ts`
  - `/Users/tangxixi/Desktop/knife/server/src/middleware/auth.ts`
  - `/Users/tangxixi/Desktop/knife/server/src/index.ts`
- 新增 Python 聊天服务目录
  - `/Users/tangxixi/Desktop/knife/chat-server/`
- 前端最小适配
  - `/Users/tangxixi/Desktop/knife/renderer/src/api/chatApi.ts`
  - `/Users/tangxixi/Desktop/knife/renderer/src/api/chatSocket.ts`
  - `/Users/tangxixi/Desktop/knife/renderer/src/page/chat-room/ChatRoomPanel.tsx`
  - `/Users/tangxixi/Desktop/knife/renderer/src/components/chat/Composer.tsx`
  - `/Users/tangxixi/Desktop/knife/renderer/src/components/chat/MessageItem.tsx`
- 启动编排
  - `/Users/tangxixi/Desktop/knife/package.json`

## 执行步骤（按顺序）

1. 在 `chat-server` 下搭建 Python 服务骨架（FastAPI + Socket.IO + MySQL + LangGraph）。
2. 迁移消息协议层（`text/image/file/link`）与消息标准化逻辑，保证空消息校验与老字段兼容。
3. 迁移 REST 接口：
   - `GET /api/chat/messages`
   - `POST /api/chat/send`
   - `POST /api/chat/upload`
4. 迁移实时网关事件：
   - `chat:send`
   - `chat:new_message`
   - `chat:online_count`
   - `chat:error`
5. 迁移鉴权能力（JWT + MCP Key 双通道，保持与现有使用方式一致）。
6. 实现 Skill 可插拔骨架（Registry + Dispatcher），默认不触发智能体流程。
7. 切换启动链路到 Python 聊天服务，并下线 Node 聊天路由/网关。
8. 前端完成最小适配（聊天 API 与 Socket 地址指向 Python 服务，消息字段兼容）。
9. 执行回归验证并确认替换成功。

## 风险与注意事项

- 直接替换模式下，接口或事件字段偏差会导致前端聊天不可用。
- 上传目录与访问 URL 必须稳定，否则历史图片/附件可能失效。
- 在线人数与广播口径变化会引发体验差异，需保持一致策略。
- LangGraph 本期仅做扩展骨架，避免与核心聊天链路深耦合造成稳定性风险。

## 验收标准

- Python 服务可独立承载聊天核心能力，并完成 Node 聊天模块替换。
- 前端可正常完成文本/图片/文件/链接消息的发送、接收与历史加载。
- 实时能力正常：在线人数、断线重连、错误通知可用。
- 上传能力正常：图片/附件可上传并可访问。
- Skill 插件骨架可注册与调度（默认关闭智能体执行路径）。
