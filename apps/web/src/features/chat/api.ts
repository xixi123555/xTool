import { createApiClient } from '../../shared/lib/http';

const CHAT_BASE =
  import.meta.env.VITE_CHAT_API_BASE ??
  (import.meta.env.PROD ? `${window.location.origin}/chatServer/api` : '/chatServer/api');

const chatClient = createApiClient(CHAT_BASE);

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

export interface RagSource {
  doc_id: number;
  source_type: string;
  source_id?: string;
  score: number;
  snippet: string;
  sheet_name?: string;
  row_index?: number;
  row_data?: Record<string, string>;
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
  rag_sources?: RagSource[];
}

interface ListResponse<T> {
  success: boolean;
  messages?: T[];
  items?: T[];
  item?: T;
  id?: number;
  message?: T;
  result?: T;
  error?: string;
}

export async function fetchChatHistory(
  roomId = 'public',
  limit = 100,
  beforeId?: number,
  allRooms = true,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (allRooms) params.set('all_rooms', '1');
  else params.set('room_id', roomId);
  if (beforeId) params.set('before_id', String(beforeId));
  const { data } = await chatClient.get<ListResponse<ChatMessage>>(
    `/chat/messages?${params.toString()}`,
  );
  if (data.error) throw new Error(data.error);
  return data.messages ?? [];
}

export async function sendChat(
  parts: ChatMessagePart[],
  roomId = 'public',
): Promise<ChatMessage | undefined> {
  const { data } = await chatClient.post<ListResponse<ChatMessage>>('/chat/send', {
    parts,
    room_id: roomId,
  });
  if (data.error) throw new Error(data.error);
  return data.message;
}

export async function sendAgentMessage(
  text: string,
  roomId = 'public',
): Promise<ChatMessage | undefined> {
  const { data } = await chatClient.post<ListResponse<ChatMessage>>('/chat/agent/send', {
    text,
    room_id: roomId,
    include_sources: true,
  });
  if (data.error) throw new Error(data.error);
  return data.message;
}

export async function uploadChatFile(
  file: File,
): Promise<{ url: string; name: string; size: number; mime_type: string } | undefined> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await chatClient.post<{
    success: boolean;
    file?: { url: string; name: string; size: number; mime_type: string };
    error?: string;
  }>('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  if (data.error) throw new Error(data.error);
  return data.file;
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
  updated_at?: string;
}

export async function listFlows(): Promise<OrchestrationFlow[]> {
  const { data } = await chatClient.get<ListResponse<OrchestrationFlow>>('/orchestration');
  if (data.error) throw new Error(data.error);
  return data.items ?? [];
}

export async function createFlow(input: {
  name: string;
  description?: string;
  graph: OrchestrationGraph;
}): Promise<number> {
  const { data } = await chatClient.post<ListResponse<never>>('/orchestration', input);
  if (data.error) throw new Error(data.error);
  return data.id ?? 0;
}

export async function updateFlow(
  id: number,
  input: { name?: string; description?: string; graph?: OrchestrationGraph },
): Promise<void> {
  const { data } = await chatClient.put<ListResponse<never>>(`/orchestration/${id}`, input);
  if (data.error) throw new Error(data.error);
}

export async function executeFlow(
  id: number,
  inputText: string,
): Promise<{ output_text: string; sources?: RagSource[] }> {
  const { data } = await chatClient.post<
    ListResponse<{ output_text: string; sources?: RagSource[] }>
  >(`/orchestration/${id}/execute`, { input_text: inputText, room_id: 'public' });
  if (data.error) throw new Error(data.error);
  if (!data.result) throw new Error('执行结果为空');
  return data.result;
}

export async function ingestText(input: { text: string; title?: string }): Promise<number> {
  const { data } = await chatClient.post<{ success: boolean; doc_id?: number; error?: string }>(
    '/chat/kb/ingest-text',
    { ...input, room_id: 'public' },
  );
  if (data.error) throw new Error(data.error);
  return data.doc_id ?? 0;
}

export async function ingestFile(input: {
  url: string;
  name: string;
  mime_type: string;
  size: number;
}): Promise<number> {
  const { data } = await chatClient.post<{ success: boolean; doc_id?: number; error?: string }>(
    '/chat/kb/ingest-file',
    { ...input, room_id: 'public' },
  );
  if (data.error) throw new Error(data.error);
  return data.doc_id ?? 0;
}
