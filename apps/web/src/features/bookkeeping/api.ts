import type {
  BookkeepingAttachment,
  BookkeepingPurpose,
  BookkeepingRecord,
  BookkeepingType,
} from '@xtool/shared';

import { del, get, post, put, httpClient } from '../../shared/lib/http';

interface RecordsResponse {
  success: boolean;
  records?: BookkeepingRecord[];
  error?: string;
}

interface PurposesResponse {
  success: boolean;
  purposes?: BookkeepingPurpose[];
  id?: number;
  error?: string;
}

interface MutationResponse {
  success: boolean;
  id?: number;
  message?: string;
  error?: string;
}

export function fetchRecords(): Promise<RecordsResponse> {
  return get('/bookkeeping/records');
}

export function createRecord(input: {
  purpose: string;
  description?: string;
  amount: number;
  type: BookkeepingType;
}): Promise<MutationResponse> {
  return post('/bookkeeping/records', input);
}

export function updateRecord(
  id: number,
  input: { purpose?: string; description?: string; amount?: number; type?: BookkeepingType },
): Promise<MutationResponse> {
  return put(`/bookkeeping/records/${id}`, input);
}

export function deleteRecord(id: number): Promise<MutationResponse> {
  return del(`/bookkeeping/records/${id}`);
}

export function fetchPurposes(): Promise<PurposesResponse> {
  return get('/bookkeeping/purposes');
}

export function createPurpose(name: string): Promise<MutationResponse> {
  return post('/bookkeeping/purposes', { name });
}

export function updatePurpose(id: number, name: string): Promise<MutationResponse> {
  return put(`/bookkeeping/purposes/${id}`, { name });
}

export function deletePurpose(id: number): Promise<MutationResponse> {
  return del(`/bookkeeping/purposes/${id}`);
}

export function setDefaultPurpose(id: number): Promise<MutationResponse> {
  return put(`/bookkeeping/purposes/${id}/default`, {});
}

export function fetchAttachments(
  recordId: number,
): Promise<{ success: boolean; attachments?: BookkeepingAttachment[]; error?: string }> {
  return get(`/bookkeeping/records/${recordId}/attachments`);
}

export async function uploadAttachments(
  recordId: number,
  files: File[],
): Promise<{ success: boolean; ids?: number[]; error?: string }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await httpClient.post(`/bookkeeping/records/${recordId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export function deleteAttachment(id: number): Promise<{ success: boolean; error?: string }> {
  return del(`/bookkeeping/attachments/${id}`);
}

export async function fetchAttachmentBlob(id: number): Promise<Blob> {
  const response = await httpClient.get(`/bookkeeping/attachments/${id}/file`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
