import type { UserSummary } from '@xtool/shared';

import { get, post, put } from '../lib/http';

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserSummary;
  error?: string;
}

export function login(params: { username: string; password: string }): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', params);
}

export function register(params: {
  username: string;
  password: string;
  email?: string;
}): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', params);
}

export function guestLogin(): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/guest');
}

export function getCurrentUser(): Promise<AuthResponse> {
  return get<AuthResponse>('/auth/me');
}

export function sendVerificationCode(
  email: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  return post('/auth/send-code', { email });
}

export function loginByCode(email: string, code: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login-by-code', { email, code });
}

export function updateProfile(params: {
  username?: string;
  email?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: UserSummary; error?: string }> {
  return put('/auth/profile', params);
}
