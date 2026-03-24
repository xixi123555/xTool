/**
 * 待办工具 - 对接 xTool Server 待办 API
 */
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { apiGet, apiPost, apiPut, requireAuth } from '../client/xtool-api.js';

const createCardSchema = z.object({
  name: z.string().min(1, '卡片名称不能为空'),
  id: z.string().optional(),
  starred: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const createItemSchema = z.object({
  card_id: z.string().min(1, '卡片 ID 不能为空'),
  content: z.string().min(1, '待办内容不能为空'),
  id: z.string().optional(),
  completed: z.boolean().optional(),
});

const updateItemSchema = z.object({
  item_id: z.string().min(1, '待办项 ID 不能为空'),
  card_id: z.string().min(1, '卡片 ID 不能为空'),
  content: z.string().optional(),
  completed: z.boolean().optional(),
});

export async function listCards(): Promise<string> {
  requireAuth();
  const res = await apiGet<{ success: boolean; cards?: Array<Record<string, unknown>>; error?: string }>(
    '/todo/cards'
  );
  if (res.error) throw new Error(res.error);
  const cards = res.cards ?? [];
  if (cards.length === 0) return '暂无待办卡片';
  const lines = cards.map((c: Record<string, unknown>) => {
    const items = (c.items as Array<Record<string, unknown>>) ?? [];
    const done = items.filter((i: Record<string, unknown>) => i.completed).length;
    return `- [${c.id}] ${c.name}（${done}/${items.length} 完成）`;
  });
  return `待办卡片：\n${lines.join('\n')}`;
}

export async function createCard(args: z.infer<typeof createCardSchema>): Promise<string> {
  requireAuth();
  const parsed = createCardSchema.parse(args);
  const id = parsed.id ?? randomUUID().slice(0, 8);
  await apiPost('/todo/cards', {
    id,
    name: parsed.name,
    starred: parsed.starred,
    tags: parsed.tags,
  });
  return `已创建待办卡片「${parsed.name}」，ID: ${id}`;
}

export async function createItem(args: z.infer<typeof createItemSchema>): Promise<string> {
  requireAuth();
  const parsed = createItemSchema.parse(args);
  const id = parsed.id ?? randomUUID().slice(0, 8);
  await apiPost('/todo/items', {
    id,
    card_id: parsed.card_id,
    content: parsed.content,
    completed: parsed.completed ?? false,
  });
  return `已在卡片 ${parsed.card_id} 下添加待办「${parsed.content}」`;
}

export async function updateItem(args: z.infer<typeof updateItemSchema>): Promise<string> {
  requireAuth();
  const parsed = updateItemSchema.parse(args);
  await apiPut(`/todo/items/${parsed.item_id}/cards/${parsed.card_id}`, {
    content: parsed.content,
    completed: parsed.completed,
  });
  const parts: string[] = [];
  if (parsed.content !== undefined) parts.push(`内容已更新`);
  if (parsed.completed !== undefined) parts.push(parsed.completed ? '已勾选完成' : '已取消完成');
  return parts.length ? parts.join('，') : '已更新';
}
