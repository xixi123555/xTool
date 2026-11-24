/**
 * 请求级上下文 - 通过 AsyncLocalStorage 在整条调用链路中传递 Bearer token
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  bearerToken: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** 在当前 AsyncLocalStorage 上下文中执行 fn，携带指定的 Bearer token */
export function runWithBearer<T>(token: string, fn: () => T): T {
  return requestContextStorage.run({ bearerToken: token }, fn);
}

/** 获取当前请求链路中的 Bearer token（可能为空） */
export function getRequestBearer(): string | undefined {
  return requestContextStorage.getStore()?.bearerToken;
}
