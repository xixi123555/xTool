/**
 * 网页阅读器工具 - 使用 Dify API 读取网页正文
 */
import { z } from 'zod';
import { config, hasAuth } from '../config.js';
import { apiGet } from '../client/xtool-api.js';
import { logger } from '../logger.js';

const DIFY_API_URL = 'https://api.dify.ai/v1/workflows/run';

const readPageSchema = z.object({
  url: z.string().url('请输入有效的 URL'),
});

async function getDifyApiKey(): Promise<string> {
  if (config.difyApiKey) return config.difyApiKey;
  if (hasAuth()) {
    const res = await apiGet<{ success: boolean; appKey?: { app_key: string }; error?: string }>(
      '/appkey/get/web_reader'
    );
    if (res.appKey?.app_key) return res.appKey.app_key;
  }
  throw new Error('未配置 DIFY_API_KEY，且无法从 xTool 获取 web_reader。请在环境变量中配置 DIFY_API_KEY 或先登录 xTool 并配置 web_reader appKey');
}

async function parseSSEStream(response: Response): Promise<string> {
  if (!response.body) throw new Error('响应体为空');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let isFinished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        const dataContent = line.slice(6).trim();
        if (!dataContent || dataContent === '[DONE]') continue;
        try {
          const data = JSON.parse(dataContent) as { event?: string; data?: { text?: string; outputs?: { text?: string } } };
          if (data.event === 'text_chunk' && data.data?.text !== undefined) {
            fullText += data.data.text;
          }
          if (data.event === 'workflow_finished') {
            isFinished = true;
            const final = data.data?.outputs?.text ?? fullText;
            return final.trim();
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return isFinished ? fullText.trim() : fullText.trim() || '未收到网页内容';
}

export async function readPage(args: z.infer<typeof readPageSchema>): Promise<string> {
  const { url } = readPageSchema.parse(args);
  logger.apiRequest('POST', DIFY_API_URL, { input_url: url });

  const apiKey = await getDifyApiKey();

  const response = await fetch(DIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: { input_url: url },
      response_mode: 'streaming',
      user: 'mcp-xtool',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.apiError('POST', DIFY_API_URL, `[${response.status}] ${errText || response.statusText}`);
    throw new Error(`Dify API 请求失败 [${response.status}]: ${errText || response.statusText}`);
  }

  const text = await parseSSEStream(response);
  logger.apiResponse('POST', DIFY_API_URL, response.status, `正文长度: ${text?.length ?? 0} 字符`);
  return text || '未能解析到网页正文内容';
}
