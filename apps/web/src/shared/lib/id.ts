/** 生成稳定的本地唯一 ID；优先使用浏览器原生 crypto */
export function createId(prefix = 'id'): string {
  const random =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
