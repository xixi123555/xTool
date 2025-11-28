/**
 * AppKey API
 */
import { get, post, put, del } from '../utils/http';

export interface AppKey {
  id: number;
  key_name: string;
  app_key: string;
  workflow_type: string;
  description?: string | null;
}

export interface SaveAppKeyParams {
  keyName: string;
  appKey: string;
  workflowType: string;
  description?: string;
}

export interface UpdateAppKeyParams {
  keyName: string;
  appKey: string;
  workflowType: string;
  description?: string;
}

export interface AppKeyResponse {
  success: boolean;
  appKey?: AppKey;
  appKeys?: AppKey[];
  id?: number;
  error?: string;
}

/**
 * 保存或更新 AppKey
 */
export async function saveAppKey(params: SaveAppKeyParams): Promise<AppKeyResponse> {
  return post<AppKeyResponse>('/appkey/save', params);
}

/**
 * 根据 key_name 获取 AppKey
 */
export async function getAppKeyByKeyName(keyName: string): Promise<AppKeyResponse> {
  return get<AppKeyResponse>(`/appkey/get/${keyName}`);
}

/**
 * 获取当前用户的所有 AppKey
 */
export async function getAllAppKeys(): Promise<AppKeyResponse> {
  return get<AppKeyResponse>('/appkey/all');
}

/**
 * 更新 AppKey
 */
export async function updateAppKey(id: number, params: UpdateAppKeyParams): Promise<AppKeyResponse> {
  return put<AppKeyResponse>(`/appkey/update/${id}`, params);
}

/**
 * 删除 AppKey
 */
export async function deleteAppKey(id: number): Promise<AppKeyResponse> {
  return del<AppKeyResponse>(`/appkey/delete/${id}`);
}

