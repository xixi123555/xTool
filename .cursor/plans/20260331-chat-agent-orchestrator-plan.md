# 聊天室聊天智能体与编排能力实现计划

## 任务目标
- 在现有聊天室中引入一个可用的聊天智能体，支持与用户在同一房间内实时对话。
- 为智能体构建独立的知识库，支持从聊天记录、截图、图片、文件及表情等多模态上下文中检索，提升回复准确率。
- 搭建一套基础的编排页面，支持拖拽/连线形式配置 LLM 节点与知识库检索节点，并保存、执行编排流程（MVP 级别）。
- 保持与现有 `chat-server`（FastAPI + LangGraph 预留）架构一致，方便后续扩展更多 Skill 与 Agent。

## 涉及文件清单
- 后端（Python `chat-server`）
  - `/Users/tangxixi/Desktop/knife/chat-server/app/core/settings.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/schemas/chat.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/domain/chat_protocol.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/repositories/chat_repository.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/services/chat_service.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/api/routes/chat.py`
  - `/Users/tangxixi/Desktop/knife/chat-server/app/realtime/socket_server.py`
  - 新增 `/Users/tangxixi/Desktop/knife/chat-server/app/services/knowledge_base_service.py`
  - 新增 `/Users/tangxixi/Desktop/knife/chat-server/app/repositories/vector_store_repository.py`
  - 新增 `/Users/tangxixi/Desktop/knife/chat-server/app/schemas/orchestration.py`
  - 新增 `/Users/tangxixi/Desktop/knife/chat-server/app/repositories/orchestration_repository.py`
  - 新增 `/Users/tangxixi/Desktop/knife/chat-server/app/api/routes/orchestration.py`
- 前端（`renderer`）
  - `/Users/tangxixi/Desktop/knife/renderer/src/api/chatApi.ts`
  - `/Users/tangxixi/Desktop/knife/renderer/src/page/chat-room/ChatRoomPanel.tsx`
  - `/Users/tangxixi/Desktop/knife/renderer/src/components/chat/MessageItem.tsx`
  - 新增 `/Users/tangxixi/Desktop/knife/renderer/src/page/agent-orchestrator/AgentOrchestratorPage.tsx`
  - 新增 `/Users/tangxixi/Desktop/knife/renderer/src/components/agent-orchestrator/*`
  - 路由配置文件（`renderer/src/router` 下对应文件）

## 执行步骤（按顺序）
1. 明确智能体调用链路与消息契约  
   - 约定聊天触发方式（按钮或指令）与消息结构（是否包含 `is_agent`、`rag_sources`）。
2. 设计并落地知识库层  
   - 抽象向量存储接口，先实现一套主流方案（建议 `pgvector`），支持写入与 TopK 检索。
   - 将聊天记录、文件文本摘要等写入知识库；图片/表情先走描述文本策略。
3. 在 `chat-server` 集成 Agent + RAG  
   - 用 LangGraph/Skill 串联输入预处理、检索、LLM 生成、输出包装。
   - 新增智能体发送接口（如 `/api/chat/agent/send`）并复用鉴权。
4. 实现编排后端能力  
   - 定义编排图数据结构（节点、边、配置）。
   - 提供编排方案 CRUD 和执行接口，落库 MySQL。
5. 实现编排前端页面与新路由  
   - 新增独立路由（如 `/agent-orchestrator`）和新页面布局（工具栏+节点面板+画布+配置栏）。
   - 支持节点拖拽、连线、配置编辑、保存与执行。
6. 聊天室接入智能体消息展示  
   - 在消息列表中高亮机器人身份，并可折叠显示引用来源。
7. 端到端联调与回归  
   - 校验普通聊天不回归、智能体对话可用、编排保存/执行可用、错误提示完整。

## 风险与注意事项
- RAG 召回质量受 embedding 模型与分片策略影响，需优先选稳定成熟方案。
- 多模态内容在 MVP 阶段先文本化，后续再增强为原生多模态检索。
- 编排页面若过度开放会导致实现复杂度激增，建议先限制节点类型和参数范围。
- 需要控制编排执行权限，避免普通用户修改全局机器人行为。

## 验收标准
- 聊天室可稳定与机器人对话，且机器人消息有明确标识。
- 机器人在知识库覆盖问题上的回答明显优于无检索方式，并能展示引用来源。
- 编排页面支持新建、拖拽节点、连线、配置、保存、加载、执行。
- 前后端主流程回归通过（历史加载、实时收发、上传、消息渲染不受影响）。

