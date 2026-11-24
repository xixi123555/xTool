import { API_BASE_URL } from '../../shared/lib/http';

export interface ClaudeTurn {
  role: 'user' | 'assistant';
  content: string;
}

function parseSseBlock(block: string): string[] {
  const chunks: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      const event = JSON.parse(raw) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta' &&
        event.delta.text
      ) {
        chunks.push(event.delta.text);
      }
    } catch {
      // 忽略无法解析的 SSE 行
    }
  }
  return chunks;
}

export async function* streamClaudeChat(
  messages: ClaudeTurn[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const token = localStorage.getItem('xtool_token');
  if (!token) throw new Error('登录已过期，请重新登录');

  const response = await fetch(`${API_BASE_URL}/claude-code/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, stream: true }),
    signal,
  });

  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // 保留默认错误
    }
    throw new Error(message);
  }

  if (!response.body) throw new Error('服务没有返回内容');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const blocks = carry.split(/\r?\n\r?\n/);
      carry = blocks.pop() ?? '';
      for (const block of blocks) {
        for (const chunk of parseSseBlock(block)) yield chunk;
      }
    }
    if (carry.trim()) {
      for (const chunk of parseSseBlock(carry)) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}
