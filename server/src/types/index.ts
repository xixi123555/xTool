/**
 * 类型定义
 */

// 用户类型
export type UserType = 'normal' | 'guest';

// 用户接口
export interface User {
  id: number;
  username: string;
  password?: string;
  email?: string | null;
  avatar?: string | null;
  user_type: UserType;
  created_at?: Date;
  updated_at?: Date;
}

// AppKey 接口
export interface AppKey {
  id: number;
  user_id: number;
  key_name: string;
  app_key: string;
  workflow_type: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// 快捷键接口
export interface Shortcut {
  id: number;
  user_id: number;
  action_name: string;
  shortcut: string;
  created_at?: Date;
  updated_at?: Date;
}

// 应用配置接口
export interface AppSetting {
  id: number;
  user_id: number;
  use_local_data: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 待办事项项接口
export interface TodoItem {
  id: string;
  card_id: string;
  content: string;
  completed: boolean;
  deleted: boolean;
  created_at: number;
  updated_at: number;
}

// 待办事项卡片接口
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

// JWT Payload
export interface JWTPayload {
  userId: number;
}

// Express Request 扩展
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: User; // authenticate 中间件确保 user 存在
}

// 数据库查询结果类型
export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
}

