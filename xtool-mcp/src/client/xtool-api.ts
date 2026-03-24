/**
 * xTool Server HTTP API 封装
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config, hasAuth } from '../config.js';
import { logger } from '../logger.js';

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(config.jwtToken ? { Authorization: `Bearer ${config.jwtToken}` } : {}),
    },
  });

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const method = (req.method ?? 'GET').toUpperCase();
    const path = req.url ?? '';
    const body = req.data;
    logger.apiRequest(method, path, body);
    return req;
  });

  client.interceptors.response.use(
    (res) => {
      const method = (res.config.method ?? 'get').toUpperCase();
      const path = res.config.url ?? '';
      const status = res.status;
      const summary = typeof res.data === 'object' ? JSON.stringify(res.data).slice(0, 300) : String(res.data).slice(0, 300);
      logger.apiResponse(method, path, status, summary);
      return res;
    },
    (err: AxiosError<{ error?: string; message?: string }>) => {
      const method = (err.config?.method ?? 'unknown').toUpperCase();
      const path = err.config?.url ?? '';
      logger.apiError(method, path, err);
      const data = err.response?.data;
      const msg = data?.error ?? data?.message ?? err.message ?? '请求失败';
      const status = err.response?.status;
      const readable = status ? `[${status}] ${msg}` : msg;
      return Promise.reject(new Error(readable));
    }
  );

  return client;
}

let _client: AxiosInstance | null = null;

export function getXToolClient(): AxiosInstance {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

/** 检查是否有认证，无则抛出可读错误 */
export function requireAuth(): void {
  if (!hasAuth()) {
    throw new Error('未配置 XTOOL_JWT_TOKEN，请先在 xTool 应用登录后配置 token');
  }
}

/** GET 请求 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const { data } = await getXToolClient().get<T>(path);
  return data;
}

/** POST 请求 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { data } = await getXToolClient().post<T>(path, body);
  return data;
}

/** PUT 请求 */
export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { data } = await getXToolClient().put<T>(path, body);
  return data;
}

/** DELETE 请求 */
export async function apiDel<T = unknown>(path: string): Promise<T> {
  const { data } = await getXToolClient().delete<T>(path);
  return data;
}
