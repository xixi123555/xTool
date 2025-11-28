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

