/**
 * 日志工具 - 输出到 stderr
 */
const PREFIX = '[xtool-mcp]';

function timestamp(): string {
  return new Date().toISOString();
}

function format(msg: string, data?: unknown): string {
  const ts = timestamp();
  if (data !== undefined) {
    try {
      const json = typeof data === 'string' ? data : JSON.stringify(data, null, 0);
      return `${ts} ${PREFIX} ${msg} ${json}`;
    } catch {
      return `${ts} ${PREFIX} ${msg} [无法序列化]`;
    }
  }
  return `${ts} ${PREFIX} ${msg}`;
}

export const logger = {
  info(msg: string, data?: unknown): void {
    process.stderr.write(format(msg, data) + '\n');
  },

  /** 记录 MCP 工具调用：入参 */
  toolInvoke(toolName: string, args: unknown): void {
    this.info(`[TOOL] 调用 ${toolName} 入参`, args);
  },

  /** 记录 MCP 工具返回 */
  toolResult(toolName: string, result: string | { content?: unknown }): void {
    const summary = typeof result === 'string' ? result : JSON.stringify(result);
    this.info(`[TOOL] ${toolName} 返回`, summary.length > 500 ? summary.slice(0, 500) + '...' : summary);
  },

  /** 记录 API 请求：方法、路径、请求体 */
  apiRequest(method: string, path: string, body?: unknown): void {
    this.info(`[API] ${method} ${path}`, body ?? null);
  },

  /** 记录 API 响应：状态、简要结果 */
  apiResponse(method: string, path: string, status: number, resultSummary?: string): void {
    this.info(`[API] ${method} ${path} => ${status}`, resultSummary ?? '');
  },

  /** 记录 API 错误 */
  apiError(method: string, path: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.info(`[API] ${method} ${path} 错误`, msg);
  },

  error(msg: string, err?: unknown): void {
    const errStr = err instanceof Error ? err.message : String(err ?? '');
    process.stderr.write(format(`${msg} ${errStr}`) + '\n');
  },
};
