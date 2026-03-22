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
  attachment_count?: number;
  image_count?: number;
}

export interface BookkeepingAttachment {
  id: number;
  record_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
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

// ---------- 附件 ----------

/**
 * 获取某条记账记录的附件列表
 */
export async function getRecordAttachments(
  recordId: number
): Promise<{ success: boolean; attachments?: BookkeepingAttachment[]; error?: string }> {
  return get(`/bookkeeping/records/${recordId}/attachments`);
}

/**
 * 上传附件（支持多文件）
 */
export async function uploadRecordAttachments(
  recordId: number,
  files: File[]
): Promise<{ success: boolean; ids?: number[]; error?: string }> {
  const { getHttpClient } = await import('../utils/http');
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await getHttpClient().post(`/bookkeeping/records/${recordId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * 删除附件
 */
export async function deleteAttachment(
  attId: number
): Promise<{ success: boolean; error?: string }> {
  return del(`/bookkeeping/attachments/${attId}`);
}

/**
 * 获取附件文件内容（返回 Blob，供预览或下载）
 */
export async function fetchAttachmentBlob(attId: number): Promise<Blob> {
  const { getHttpClient } = await import('../utils/http');
  const res = await getHttpClient().get(`/bookkeeping/attachments/${attId}/file`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}
