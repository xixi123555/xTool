/**
 * 聊天 REST API — 历史消息查询等
 */
import { getHttpClient } from '../utils/http';

const CHAT_API_BASE = import.meta.env.VITE_CHAT_API_BASE || (
  import.meta.env.PROD ? 'http://39.105.137.213:5298/api' : 'http://localhost:5298/api'
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
