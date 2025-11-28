/**
 * 快捷键 API
 */
import { post, get, del } from '../utils/http';

export interface SaveShortcutParams {
  actionName: string;
  shortcut: string;
}

export interface ShortcutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ShortcutsResponse {
  success: boolean;
  shortcuts: Record<string, string>;
}

/**
 * 保存或更新快捷键
 */
export async function saveShortcut(params: SaveShortcutParams): Promise<ShortcutResponse> {
  return post<ShortcutResponse>('/shortcut/save', params);
}

/**
 * 获取用户的所有自定义快捷键
 */
export async function getAllShortcuts(): Promise<ShortcutsResponse> {
  return get<ShortcutsResponse>('/shortcut/all');
}

/**
 * 删除快捷键（恢复为默认值）
 */
export async function deleteShortcut(actionName: string): Promise<ShortcutResponse> {
  return del<ShortcutResponse>(`/shortcut/delete/${actionName}`);
}

