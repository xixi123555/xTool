/**
 * Dify 工作流流式调用。
 *
 * AppKey 存在自己的服务端，浏览器只持有短期请求所需的 key；
 * 页面只关心增量文本，SSE 解析细节收敛在这里。
 */
import { get } from './http';

const DIFY_API_URL = import.meta.env.VITE_DIFY_API_URL ?? 'https://api.dify.ai/v1/workflows/run';

interface AppKeyResponse {
  success: boolean;
  appKey?: { app_key: string };
  error?: string;
}

async function getAppKey(keyName: string): Promise<string> {
  try {
    const result = await get<AppKeyResponse>(`/appkey/get/${keyName}`);
    if (!result.appKey?.app_key) throw new Error('未配置服务密钥');
    return result.appKey.app_key;
  } catch {
    throw new Error('未配置服务密钥，请先在「设置 - AI 服务密钥」中填写');
  }
}

interface DifyEvent {
  event?: string;
  data?: {
    text?: string;
    outputs?: { text?: string };
  };
}

export async function runDifyWorkflow(options: {
  keyName: string;
  inputs: Record<string, string>;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const appKey = await getAppKey(options.keyName);
  const response = await fetch(DIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appKey}`,
    },
    body: JSON.stringify({
      inputs: options.inputs,
      response_mode: 'streaming',
      user: 'xtool-web',
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`服务返回异常（${response.status}）`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let finalText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const event = JSON.parse(payload) as DifyEvent;
        if (event.event === 'text_chunk' && event.data?.text) {
          fullText += event.data.text;
          options.onChunk?.(event.data.text);
        }
        if (event.event === 'workflow_finished') {
          finalText = event.data?.outputs?.text ?? '';
        }
      } catch {
        // 单条 SSE 解析失败不影响后续文本
      }
    }
  }

  const text = (finalText || fullText).trim();
  if (!text) throw new Error('服务没有返回内容');
  return text;
}
