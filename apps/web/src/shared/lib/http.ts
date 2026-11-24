/**
 * 统一 HTTP 客户端。
 *
 * 开发环境走 Vite 代理 /api，生产环境默认走反向代理 /server/api；
 * 401 时清空登录态并带原路径跳转登录页，避免每个页面各写一遍。
 */
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { saveLoginRedirect } from './redirect';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.PROD ? `${window.location.origin}/server/api` : '/api');

const AUTH_PATHS = ['/auth/login', '/auth/login-by-code', '/auth/guest', '/auth/send-code'];

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 120_000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('xtool_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: string; message?: string }>) => {
      const status = error.response?.status;
      const requestPath = error.config?.url ?? '';
      const isAuthRequest = AUTH_PATHS.some((path) => requestPath.includes(path));

      if (status === 401 && !isAuthRequest) {
        saveLoginRedirect(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
        localStorage.removeItem('xtool_token');
        localStorage.removeItem('xtool_user');
        window.location.assign('/login');
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const httpClient: AxiosInstance = createApiClient(API_BASE_URL);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.put<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
}

/** 只返回业务可读文案；不把 axios 的英文错误/状态码直接抛给用户 */
export function errorMessage(error: unknown, fallback = '请求失败，请稍后重试'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试';
    if (!error.response) return '网络连接失败，请检查网络后重试';
    return fallback;
  }
  if (error instanceof Error && error.message && !/status code/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
