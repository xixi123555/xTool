/**
 * 聊天 REST API — 历史消息查询等
 */
import { get } from '../utils/http';

export interface ChatMessagePart {
  type: 'text' | 'image' | 'file';
  text?: string;
  image_url?: string;
  mime_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
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

  const res = await get<MessagesResponse>(`/chat/messages?${params.toString()}`);
  if (res.error) throw new Error(res.error);
  return res.messages ?? [];
}
