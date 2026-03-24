/**
 * xTool MCP 配置 - 从环境变量加载
 */
import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const val = process.env[key] ?? defaultValue;
  return (val || '').trim();
};

export const config = {
  /** xTool Server 基础 URL，如 http://localhost:5198 */
  serverUrl: getEnv('XTOOL_SERVER_URL', 'http://localhost:5198'),

  /** API 基础路径（Server 路由挂载在 /api 下） */
  get apiBaseUrl(): string {
    const base = this.serverUrl.replace(/\/$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  },

  /** JWT Token，用于调用需认证的接口 */
  jwtToken: getEnv('XTOOL_JWT_TOKEN'),

  /** Dify API Key，网页阅读器专用（可选） */
  difyApiKey: getEnv('DIFY_API_KEY'),
};

/** 是否已配置 xTool 认证（记账、待办等需要） */
export function hasAuth(): boolean {
  return Boolean(config.jwtToken);
}

/** 是否可用的网页阅读器（Dify Key 或可从 appkey 获取） */
export function hasWebReader(): boolean {
  return Boolean(config.difyApiKey) || hasAuth();
}
