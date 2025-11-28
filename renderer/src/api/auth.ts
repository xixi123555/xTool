/**
 * 认证 API
 */
import { post, get } from '../utils/http';

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    username: string;
    email?: string;
    user_type: 'normal' | 'guest';
  };
  shortcuts?: Record<string, string>;
  error?: string;
}

/**
 * 用户登录
 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', params);
}

/**
 * 用户注册
 */
export async function register(params: RegisterParams): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', params);
}

/**
 * 路人身份登录
 */
export async function guestLogin(): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/guest');
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  return get<AuthResponse>('/auth/me');
}

