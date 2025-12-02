/**
 * 待办事项 API
 */
import { get, post, put, del } from '../utils/http';

export interface TodoItem {
  id: string;
  card_id: string;
  content: string;
  completed: boolean;
  deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface TodoCard {
  id: string;
  user_id: number;
  name: string;
  starred: boolean;
  tags: string[];
  deleted: boolean;
  created_at: number;
  updated_at: number;
  items?: TodoItem[];
}

export interface TodoResponse {
  success: boolean;
  cards?: TodoCard[];
  message?: string;
  error?: string;
}

/**
 * 获取用户的所有待办卡片
 */
export async function getTodoCards(): Promise<TodoResponse> {
  return get<TodoResponse>('/todo/cards');
}

/**
 * 创建待办卡片
 */
export async function createTodoCard(card: { id: string; name: string; starred?: boolean; tags?: string[] }): Promise<TodoResponse> {
  return post<TodoResponse>('/todo/cards', card);
}

/**
 * 更新待办卡片
 */
export async function updateTodoCard(cardId: string, updates: { name?: string; starred?: boolean; tags?: string[] }): Promise<TodoResponse> {
  return put<TodoResponse>(`/todo/cards/${cardId}`, updates);
}

/**
 * 删除待办卡片（逻辑删除）
 */
export async function deleteTodoCard(cardId: string): Promise<TodoResponse> {
  return del<TodoResponse>(`/todo/cards/${cardId}`);
}

/**
 * 创建待办项
 */
export async function createTodoItem(item: { id: string; card_id: string; content: string; completed?: boolean }): Promise<TodoResponse> {
  return post<TodoResponse>('/todo/items', item);
}

/**
 * 更新待办项
 */
export async function updateTodoItem(itemId: string, cardId: string, updates: { content?: string; completed?: boolean }): Promise<TodoResponse> {
  return put<TodoResponse>(`/todo/items/${itemId}/cards/${cardId}`, updates);
}

/**
 * 删除待办项（逻辑删除）
 */
export async function deleteTodoItem(itemId: string, cardId: string): Promise<TodoResponse> {
  return del<TodoResponse>(`/todo/items/${itemId}/cards/${cardId}`);
}

