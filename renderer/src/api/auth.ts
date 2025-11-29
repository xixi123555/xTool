/**
 * 认证 API
 */
import { post, get, put } from '../utils/http';

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

export async function sendVerificationCode(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return post<{ success: boolean; message?: string; error?: string }>('/auth/send-code', { email });
}

export async function loginByCode(email: string, code: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login-by-code', { email, code });
}

export interface UpdateProfileParams {
  username?: string;
  email?: string;
  avatar?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  user?: {
    id: number;
    username: string;
    email?: string;
    avatar?: string;
    user_type: 'normal' | 'guest';
  };
  error?: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResponse> {
  return put<UpdateProfileResponse>('/auth/profile', params);
}

