/**
 * Claude 代码助手 API — 经 xTool Server 代理 Anthropic
 */
const API_ORIGIN = import.meta.env.PROD
  ? 'https://39.105.137.213:5198'
  : 'http://localhost:5198';

const MESSAGES_PATH = `${API_ORIGIN}/api/claude-code/messages`;

export type ClaudeChatTurn = { role: 'user' | 'assistant'; content: string };

function getToken(): string | null {
  try {
    return localStorage.getItem('xtool_token');
  } catch {
    return null;
  }
}

function parseSseBlock(block: string): string[] {
  const chunks: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      const data = JSON.parse(raw) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (
        data.type === 'content_block_delta' &&
        data.delta?.type === 'text_delta' &&
        data.delta.text
      ) {
        chunks.push(data.delta.text);
      }
    } catch {
      /* ignore malformed json */
    }
  }
  return chunks;
}

/**
 * 流式发送对话，依次产出文本增量
 */
export async function* streamClaudeChat(
  messages: ClaudeChatTurn[]
): AsyncGenerator<string, void, undefined> {
  const token = getToken();
  if (!token) {
    throw new Error('未登录');
  }

  const res = await fetch(MESSAGES_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, stream: true }),
  });

  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* keep default */
      }
    }
    throw new Error(msg);
  }

  if (!res.body) {
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });

      const parts = carry.split(/\r?\n\r?\n/);
      carry = parts.pop() ?? '';

      for (const block of parts) {
        for (const c of parseSseBlock(block)) {
          yield c;
        }
      }
    }

    if (carry.trim()) {
      for (const c of parseSseBlock(carry)) {
        yield c;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
