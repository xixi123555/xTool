import type { TodoCard, TodoItem } from '@xtool/shared';

import { del, get, post, put } from '../../shared/lib/http';

interface TodoResponse {
  success: boolean;
  cards?: TodoCard[];
  error?: string;
}

export function fetchTodoCards(): Promise<TodoResponse> {
  return get('/todo/cards');
}

export function createTodoCard(input: {
  id: string;
  name: string;
  starred?: boolean;
  tags?: string[];
}): Promise<TodoResponse> {
  return post('/todo/cards', input);
}

export function updateTodoCard(
  cardId: string,
  input: { name?: string; starred?: boolean; tags?: string[] },
): Promise<TodoResponse> {
  return put(`/todo/cards/${cardId}`, input);
}

export function deleteTodoCard(cardId: string): Promise<TodoResponse> {
  return del(`/todo/cards/${cardId}`);
}

export function createTodoItem(input: {
  id: string;
  card_id: string;
  content: string;
  completed?: boolean;
}): Promise<TodoResponse> {
  return post('/todo/items', input);
}

export function updateTodoItem(
  itemId: string,
  cardId: string,
  input: { content?: string; completed?: boolean },
): Promise<TodoResponse> {
  return put(`/todo/items/${itemId}/cards/${cardId}`, input);
}

export function deleteTodoItem(itemId: string, cardId: string): Promise<TodoResponse> {
  return del(`/todo/items/${itemId}/cards/${cardId}`);
}

export type { TodoCard, TodoItem };
