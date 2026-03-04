/**
 * 记账 API
 */
import { get, post, put, del } from '../utils/http';

export interface BookkeepingRecord {
  id: number;
  user_id: number;
  purpose: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  record_date: string;
  created_at: string;
  updated_at: string;
  username?: string;
}

/** 记账用途（可编辑标签，is_default 表示默认选中） */
export interface BookkeepingPurposeItem {
  id: number;
  name: string;
  is_default: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookkeepingResponse {
  success: boolean;
  records?: BookkeepingRecord[];
  purposes?: BookkeepingPurposeItem[];
  id?: number;
  message?: string;
  error?: string;
}

/**
 * 获取所有记账记录
 */
export async function getBookkeepingRecords(): Promise<BookkeepingResponse> {
  return get<BookkeepingResponse>('/bookkeeping/records');
}

/**
 * 创建记账记录（服务器自动使用当前时间）
 */
export async function createBookkeepingRecord(record: {
  purpose: string;
  description?: string;
  amount: number;
  type: 'expense' | 'income';
}): Promise<BookkeepingResponse> {
  return post<BookkeepingResponse>('/bookkeeping/records', record);
}

/**
 * 更新记账记录
 */
export async function updateBookkeepingRecord(
  id: number,
  updates: {
    purpose?: string;
    description?: string;
    amount?: number;
    type?: 'expense' | 'income';
  }
): Promise<BookkeepingResponse> {
  return put<BookkeepingResponse>(`/bookkeeping/records/${id}`, updates);
}

/**
 * 删除记账记录
 */
export async function deleteBookkeepingRecord(id: number): Promise<BookkeepingResponse> {
  return del<BookkeepingResponse>(`/bookkeeping/records/${id}`);
}

// ---------- 用途 ----------
/**
 * 获取所有用途（默认用途排最前）
 */
export async function getBookkeepingPurposes(): Promise<BookkeepingResponse> {
  return get<BookkeepingResponse>('/bookkeeping/purposes');
}

/**
 * 新增用途
 */
export async function createBookkeepingPurpose(name: string): Promise<BookkeepingResponse> {
  return post<BookkeepingResponse>('/bookkeeping/purposes', { name });
}

/**
 * 更新用途名称
 */
export async function updateBookkeepingPurpose(id: number, name: string): Promise<BookkeepingResponse> {
  return put<BookkeepingResponse>(`/bookkeeping/purposes/${id}`, { name });
}

/**
 * 删除用途
 */
export async function deleteBookkeepingPurpose(id: number): Promise<BookkeepingResponse> {
  return del<BookkeepingResponse>(`/bookkeeping/purposes/${id}`);
}

/**
 * 设为默认用途
 */
export async function setDefaultBookkeepingPurpose(id: number): Promise<BookkeepingResponse> {
  return put<BookkeepingResponse>(`/bookkeeping/purposes/${id}/default`, {});
}
