/**
 * 聊天 REST API — 历史消息查询等
 */
import { getHttpClient } from '../utils/http';

const CHAT_API_BASE = import.meta.env.VITE_CHAT_API_BASE || (
  import.meta.env.PROD ? `${window.location.origin}/chatServer/api` : 'http://localhost:5298/api'
);
const chatHttp = getHttpClient();

export interface ChatMessagePart {
  type: 'text' | 'image' | 'file' | 'link';
  text?: string;
  image_url?: string;
  mime_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  payload?: {
    text?: string;
    url?: string;
    name?: string;
    size?: number;
    mime_type?: string;
    title?: string;
    description?: string;
  };
}

export interface ChatMessage {
  id: number;
  room_id: string;
  user_id: number;
  content_json: ChatMessagePart[];
  created_at?: string;
  username?: string;
  avatar?: string | null;
  is_agent?: boolean;
  agent_name?: string;
  pending?: boolean;
  error?: boolean;
  rag_sources?: Array<{
    doc_id: number;
    source_type: string;
    source_id?: string;
    score: number;
    snippet: string;
    sheet_name?: string;
    row_index?: number;
    row_data?: Record<string, string>;
  }>;
}

interface MessagesResponse {
  success: boolean;
  messages: ChatMessage[];
  error?: string;
}

interface SendResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

interface GenericResponse<T> {
  success: boolean;
  error?: string;
  id?: number;
  item?: T;
  items?: T[];
  result?: T;
}

export async function fetchChatHistory(
  roomId: string = 'public',
  limit: number = 50,
  beforeId?: number,
  options?: { allRooms?: boolean }
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (options?.allRooms) {
    params.set('all_rooms', '1');
  } else {
    params.set('room_id', roomId);
  }
  if (beforeId) params.set('before_id', String(beforeId));

  const { data: res } = await chatHttp.get<MessagesResponse>(`${CHAT_API_BASE}/chat/messages?${params.toString()}`);
  if (res.error) throw new Error(res.error);
  return res.messages ?? [];
}

export async function sendChatByRest(payload: {
  text?: string;
  parts?: ChatMessagePart[];
  room_id?: string;
}): Promise<ChatMessage | undefined> {
  const { data: res } = await chatHttp.post<SendResponse>(`${CHAT_API_BASE}/chat/send`, payload);
  if (res.error) throw new Error(res.error);
  return res.message;
}

export async function uploadChatFile(file: File): Promise<{
  url: string;
  name: string;
  size: number;
  mime_type: string;
} | undefined> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await chatHttp.post<{
    success: boolean;
    file?: { url: string; name: string; size: number; mime_type: string };
    error?: string;
  }>(`${CHAT_API_BASE}/chat/upload`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (data.error) throw new Error(data.error);
  return data.file;
}

export async function sendAgentChat(payload: {
  text: string;
  room_id?: string;
  include_sources?: boolean;
}): Promise<ChatMessage | undefined> {
  const { data: res } = await chatHttp.post<SendResponse>(`${CHAT_API_BASE}/chat/agent/send`, payload);
  if (res.error) throw new Error(res.error);
  return res.message;
}

export interface OrchestrationNode {
  id: string;
  type: 'input' | 'rag_retriever' | 'llm' | 'output';
  label: string;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
}

export interface OrchestrationEdge {
  id: string;
  source: string;
  target: string;
}

export interface OrchestrationGraph {
  nodes: OrchestrationNode[];
  edges: OrchestrationEdge[];
}

export interface OrchestrationFlow {
  id: number;
  name: string;
  description?: string;
  graph: OrchestrationGraph;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export async function listOrchestrationFlows(): Promise<OrchestrationFlow[]> {
  const { data } = await chatHttp.get<GenericResponse<OrchestrationFlow>>(`${CHAT_API_BASE}/orchestration`);
  if (data.error) throw new Error(data.error);
  return data.items ?? [];
}

export async function getOrchestrationFlow(flowId: number): Promise<OrchestrationFlow | undefined> {
  const { data } = await chatHttp.get<GenericResponse<OrchestrationFlow>>(
    `${CHAT_API_BASE}/orchestration/${flowId}`
  );
  if (data.error) throw new Error(data.error);
  return data.item;
}

export async function createOrchestrationFlow(payload: {
  name: string;
  description?: string;
  graph: OrchestrationGraph;
}): Promise<number> {
  const { data } = await chatHttp.post<GenericResponse<never>>(`${CHAT_API_BASE}/orchestration`, payload);
  if (data.error) throw new Error(data.error);
  return data.id ?? 0;
}

export async function updateOrchestrationFlow(
  flowId: number,
  payload: { name?: string; description?: string; graph?: OrchestrationGraph }
): Promise<void> {
  const { data } = await chatHttp.put<GenericResponse<never>>(
    `${CHAT_API_BASE}/orchestration/${flowId}`,
    payload
  );
  if (data.error) throw new Error(data.error);
}

export async function executeOrchestrationFlow(
  flowId: number,
  payload: { input_text: string; room_id?: string }
): Promise<{
  flow_id: number;
  flow_name: string;
  room_id: string;
  input_text: string;
  output_text: string;
  sources: Array<{ doc_id: number; source_type: string; source_id?: string; score: number; snippet: string }>;
}> {
  const { data } = await chatHttp.post<GenericResponse<any>>(
    `${CHAT_API_BASE}/orchestration/${flowId}/execute`,
    payload
  );
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function ingestKnowledgeText(payload: {
  text: string;
  title?: string;
  room_id?: string;
}): Promise<number> {
  const { data } = await chatHttp.post<{ success: boolean; doc_id?: number; error?: string }>(
    `${CHAT_API_BASE}/chat/kb/ingest-text`,
    payload
  );
  if (data.error) throw new Error(data.error);
  return data.doc_id ?? 0;
}

export async function ingestKnowledgeFile(payload: {
  url: string;
  name: string;
  mime_type: string;
  size: number;
  room_id?: string;
}): Promise<number> {
  const { data } = await chatHttp.post<{ success: boolean; doc_id?: number; error?: string }>(
    `${CHAT_API_BASE}/chat/kb/ingest-file`,
    payload
  );
  if (data.error) throw new Error(data.error);
  return data.doc_id ?? 0;
}
