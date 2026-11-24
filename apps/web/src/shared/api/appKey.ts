import { del, get, post, put } from '../lib/http';

export interface AppKey {
  id: number;
  key_name: string;
  app_key: string;
  workflow_type: string;
  description?: string | null;
}

interface AppKeyResponse {
  success: boolean;
  appKey?: AppKey;
  appKeys?: AppKey[];
  id?: number;
  error?: string;
}

export function fetchAppKeys(): Promise<AppKeyResponse> {
  return get('/appkey/all');
}

export function saveAppKey(input: {
  keyName: string;
  appKey: string;
  workflowType: string;
  description?: string;
}): Promise<AppKeyResponse> {
  return post('/appkey/save', input);
}

export function updateAppKey(
  id: number,
  input: { keyName: string; appKey: string; workflowType: string; description?: string },
): Promise<AppKeyResponse> {
  return put(`/appkey/update/${id}`, input);
}

export function deleteAppKey(id: number): Promise<AppKeyResponse> {
  return del(`/appkey/delete/${id}`);
}
