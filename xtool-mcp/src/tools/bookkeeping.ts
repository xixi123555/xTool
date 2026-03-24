/**
 * 记账工具 - 对接 xTool Server 记账 API
 */
import { z } from 'zod';
import { apiGet, apiPost, requireAuth } from '../client/xtool-api.js';

const addRecordSchema = z.object({
  purpose: z.string().min(1, '用途不能为空'),
  amount: z.number().positive('金额必须为正数'),
  description: z.string().optional(),
});

export async function addExpense(args: z.infer<typeof addRecordSchema>): Promise<string> {
  requireAuth();
  const { purpose, amount, description } = addRecordSchema.parse(args);
  const res = await apiPost<{ success: boolean; id?: number; message?: string; error?: string }>(
    '/bookkeeping/records',
    { purpose, amount, description: description || '', type: 'expense' }
  );
  if (res.error) throw new Error(res.error);
  return `记账成功，支出 ${amount} 元（${purpose}）${res.id ? `，记录 ID: ${res.id}` : ''}`;
}

export async function addIncome(args: z.infer<typeof addRecordSchema>): Promise<string> {
  requireAuth();
  const { purpose, amount, description } = addRecordSchema.parse(args);
  const res = await apiPost<{ success: boolean; id?: number; message?: string; error?: string }>(
    '/bookkeeping/records',
    { purpose, amount, description: description || '', type: 'income' }
  );
  if (res.error) throw new Error(res.error);
  return `记账成功，收入 ${amount} 元（${purpose}）${res.id ? `，记录 ID: ${res.id}` : ''}`;
}

export async function listRecords(): Promise<string> {
  requireAuth();
  const res = await apiGet<{ success: boolean; records?: Array<Record<string, unknown>>; error?: string }>(
    '/bookkeeping/records'
  );
  if (res.error) throw new Error(res.error);
  const records = res.records ?? [];
  if (records.length === 0) return '暂无记账记录';
  const lines = records.map((r: Record<string, unknown>) => {
    const amt = r.amount as number;
    const sign = (r.type as string) === 'income' ? '+' : '-';
    return `- ${r.purpose} ${sign}${amt} 元${r.description ? `（${r.description}）` : ''}`;
  });
  return `记账记录（共 ${records.length} 条）：\n${lines.join('\n')}`;
}

export async function listPurposes(): Promise<string> {
  requireAuth();
  const res = await apiGet<{ success: boolean; purposes?: Array<{ id: number; name: string; is_default?: number }>; error?: string }>(
    '/bookkeeping/purposes'
  );
  if (res.error) throw new Error(res.error);
  const purposes = res.purposes ?? [];
  if (purposes.length === 0) return '暂无用途标签';
  const lines = purposes.map((p) => `- ${p.name}${p.is_default ? '（默认）' : ''}`);
  return `用途标签：\n${lines.join('\n')}`;
}
