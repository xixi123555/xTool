/**
 * 聊天 REST API — 历史消息查询等
 */
import { get } from '../utils/http';

export interface ChatMessagePart {
  type: 'text' | 'image';
  text?: string;
  image_url?: string;
  mime_type?: string;
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

export async function fetchChatHistory(
  roomId: string = 'public',
  limit: number = 50,
  beforeId?: number
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ room_id: roomId, limit: String(limit) });
  if (beforeId) params.set('before_id', String(beforeId));

  const res = await get<MessagesResponse>(`/chat/messages?${params.toString()}`);
  if (res.error) throw new Error(res.error);
  return res.messages ?? [];
}
