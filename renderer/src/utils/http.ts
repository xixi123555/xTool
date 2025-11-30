/**
 * HTTP 请求模块 - 基于 axios 的统一请求处理
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 创建 axios 实例
const httpClient: AxiosInstance = axios.create({
  baseURL: 'http://39.105.137.213:5198/api', // API 基础 URL
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 从 localStorage 获取 token 并设置到请求头
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('xtool_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 请求拦截器
httpClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加统一的请求处理逻辑
    // 例如：添加 token、修改 headers 等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status;
      const message = error.response.data?.message || error.message || '请求失败';
      console.error(`HTTP Error ${status}:`, message);
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('Network Error:', error.message);
    } else {
      // 其他错误
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * GET 请求
 */
export async function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

/**
 * POST 请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
}

/**
 * PUT 请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await httpClient.put<T>(url, data, config);
  return response.data;
}

/**
 * DELETE 请求
 */
export async function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
}

/**
 * 流式请求（用于 SSE 等场景）
 * 返回 Response 对象，可以用于读取流
 */
export async function stream(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<Response> {
  // 使用 fetch 来处理流式响应，因为 axios 对 SSE 的支持不如 fetch 直接
  // 合并 headers：先使用 axios 默认 headers，然后使用 config 中的 headers 覆盖
  const defaultHeaders: Record<string, string> = {};
  Object.keys(httpClient.defaults.headers.common).forEach((key) => {
    const value = httpClient.defaults.headers.common[key];
    if (typeof value === 'string') {
      defaultHeaders[key] = value;
    }
  });

  const headers: Record<string, string> = {
    ...defaultHeaders,
    'Content-Type': 'application/json',
    ...(config?.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  return response;
}

/**
 * 获取 axios 实例（用于需要更复杂配置的场景）
 */
export function getHttpClient(): AxiosInstance {
  return httpClient;
}

/**
 * 设置默认请求头
 */
export function setDefaultHeader(key: string, value: string): void {
  httpClient.defaults.headers.common[key] = value;
}

/**
 * 移除默认请求头
 */
export function removeDefaultHeader(key: string): void {
  delete httpClient.defaults.headers.common[key];
}

