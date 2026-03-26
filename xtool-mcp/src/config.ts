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

  /** JWT Token / MCP Key（后备默认 Bearer） */
  jwtToken: getEnv('XTOOL_JWT_TOKEN'),

  /** Dify API Key，网页阅读器专用（可选） */
  difyApiKey: getEnv('DIFY_API_KEY'),

  /** HTTP 服务端口 */
  httpPort: Number(getEnv('MCP_HTTP_PORT', '5197')) || 5197,

  /** HTTP 监听地址 */
  httpHost: getEnv('MCP_HTTP_HOST', '127.0.0.1'),

  /** MCP 路由路径 */
  httpPath: getEnv('MCP_HTTP_PATH', '/mcp') || '/mcp',

  /** 允许的 Host 列表（公网反代安全） */
  allowedHosts: getEnv('MCP_ALLOWED_HOSTS')
    ? getEnv('MCP_ALLOWED_HOSTS').split(',').map((h) => h.trim()).filter(Boolean)
    : undefined,
};

/** 环境变量是否配置了 xTool 后备 Token */
export function hasEnvToken(): boolean {
  return Boolean(config.jwtToken);
}

/** 环境变量是否配置了 Dify Key */
export function hasEnvDifyKey(): boolean {
  return Boolean(config.difyApiKey);
}
