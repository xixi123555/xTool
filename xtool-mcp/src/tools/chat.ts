/**
 * 聊天工具 - 对接 xTool Server 聊天 API
 */
import { z } from 'zod';
import { apiGet, apiPost, requireAuth } from '../client/xtool-api.js';

const sendMessageSchema = z.object({
  text: z.string().min(1, '消息内容不能为空'),
  room_id: z.string().optional(),
});

const listMessagesSchema = z.object({
  room_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  before_id: z.number().int().optional(),
});

interface ChatMessagePart {
  type: 'text' | 'image';
  text?: string;
  image_url?: string;
}

interface ChatMessage {
  id: number;
  room_id: string;
  user_id: number;
  content_json: ChatMessagePart[];
  created_at?: string;
  username?: string;
}

export async function sendMessage(args: z.infer<typeof sendMessageSchema>): Promise<string> {
  requireAuth();
  const { text, room_id } = sendMessageSchema.parse(args);
  const res = await apiPost<{ success: boolean; message?: ChatMessage; error?: string }>(
    '/chat/send',
    { text, room_id: room_id || 'public' }
  );
  if (res.error) throw new Error(res.error);
  const msg = res.message;
  return `消息发送成功${msg ? `（ID: ${msg.id}，用户: ${msg.username}）` : ''}`;
}

export async function listMessages(args: z.infer<typeof listMessagesSchema>): Promise<string> {
  requireAuth();
  const { room_id, limit, before_id } = listMessagesSchema.parse(args);
  const params = new URLSearchParams();
  params.set('room_id', room_id || 'public');
  if (limit) params.set('limit', String(limit));
  if (before_id) params.set('before_id', String(before_id));

  const res = await apiGet<{ success: boolean; messages?: ChatMessage[]; error?: string }>(
    `/chat/messages?${params.toString()}`
  );
  if (res.error) throw new Error(res.error);
  const messages = res.messages ?? [];
  if (messages.length === 0) return '暂无聊天消息';

  const lines = messages.map((m) => {
    const textContent = m.content_json
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join('');
    return `- [${m.username}] ${textContent}`;
  });
  return `聊天记录（${messages.length} 条）：\n${lines.join('\n')}`;
}

export { sendMessageSchema, listMessagesSchema };
