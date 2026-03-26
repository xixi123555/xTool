/**
 * xTool Server HTTP API 封装
 * 远端 MCP 模式下，每次调用根据请求级 Bearer 或环境变量后备 Token 组装 Authorization
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config, hasEnvToken } from '../config.js';
import { getRequestBearer } from '../requestContext.js';
import { logger } from '../logger.js';

function getEffectiveToken(): string {
  return getRequestBearer() || config.jwtToken;
}

function createClient(token: string): AxiosInstance {
  const client = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const method = (req.method ?? 'GET').toUpperCase();
    const path = req.url ?? '';
    logger.apiRequest(method, path, req.data);
    return req;
  });

  client.interceptors.response.use(
    (res) => {
      const method = (res.config.method ?? 'get').toUpperCase();
      const path = res.config.url ?? '';
      const summary = typeof res.data === 'object'
        ? JSON.stringify(res.data).slice(0, 300)
        : String(res.data).slice(0, 300);
      logger.apiResponse(method, path, res.status, summary);
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

/** 获取当次调用有效的 Axios 客户端（每次基于 effective token 创建，避免跨请求串 token） */
function getClient(): AxiosInstance {
  const token = getEffectiveToken();
  return createClient(token);
}

/** 检查是否有有效认证（请求级 Bearer 或 env 后备），无则抛出可读错误 */
export function requireAuth(): void {
  const token = getEffectiveToken();
  if (!token) {
    throw new Error('未提供认证信息：请在请求头中携带 Bearer token，或在环境变量中配置 XTOOL_JWT_TOKEN');
  }
}

/** 是否有有效认证（请求级或 env） */
export function hasEffectiveAuth(): boolean {
  return Boolean(getEffectiveToken());
}

/** 环境变量层面是否有后备 token（供启动日志等使用） */
export { hasEnvToken };

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const { data } = await getClient().get<T>(path);
  return data;
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { data } = await getClient().post<T>(path, body);
  return data;
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { data } = await getClient().put<T>(path, body);
  return data;
}

export async function apiDel<T = unknown>(path: string): Promise<T> {
  const { data } = await getClient().delete<T>(path);
  return data;
}
