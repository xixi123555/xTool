/**
 * 翻译服务 - 使用 Dify AI API 进行中英文翻译
 */
import { stream } from './http';

const DIFY_API_URL = 'https://api.dify.ai/v1/workflows/run';

export interface TranslationResult {
  text: string;
  isComplete: boolean;
}

/**
 * SSE 事件处理器类型
 */
export interface SSEEventHandlers {
  onEvent?: (event: string, data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * 解析 Server-Sent Events (SSE) 流
 * @param response - Fetch Response 对象
 * @param handlers - 事件处理器
 * @returns Promise<void>
 */
export async function parseSSEStream(
  response: Response,
  handlers: SSEEventHandlers
): Promise<void> {
  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

      for (const line of lines) {
        if (!line.trim()) continue; // 跳过空行
        
        if (line.startsWith('data: ')) {
          const dataContent = line.slice(6).trim();
          if (!dataContent || dataContent === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataContent);
            
            // 调用通用事件处理器
            if (handlers.onEvent && data.event) {
              handlers.onEvent(data.event, data);
            }
          } catch (e) {
            // 忽略 JSON 解析错误（可能是其他格式的数据）
            console.warn('Failed to parse SSE data:', line, e);
          }
        }
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (handlers.onError) {
      handlers.onError(err);
    } else {
      throw err;
    }
  }
}

/**
 * 检测文本语言（简单检测：包含中文字符则为中文，否则为英文）
 */
export function detectLanguage(text: string): 'zh' | 'en' {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

/**
 * 翻译文本（流式响应）
 */
export async function translateText(
  text: string,
  onChunk: (chunk: string) => void,
  onComplete: (result: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    // 使用 HTTP 模块的 stream 方法发送请求
    const response = await stream(
      DIFY_API_URL,
      {
        inputs: { word: text },
        response_mode: 'streaming',
        user: 'abc-123',
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
        },
      }
    );

    let fullText = '';
    let isFinished = false;

    // 使用封装的 SSE 解析方法
    await parseSSEStream(response, {
      onEvent: (event, data) => {
        // 处理 text_chunk 事件
        if (event === 'text_chunk' && data.data?.text !== undefined) {
          const chunk = data.data.text;
          fullText += chunk;
          onChunk(chunk);
        }
        
        // 处理 workflow_finished 事件
        if (event === 'workflow_finished') {
          isFinished = true;
          const finalText = data.data?.outputs?.text || fullText;
          onComplete(finalText.trim());
        }
      },
      onError: (error) => {
        onError(error);
      },
    });

    // 如果没有收到 workflow_finished 事件，使用累积的文本
    if (!isFinished) {
      if (fullText) {
        onComplete(fullText.trim());
      } else {
        throw new Error('未收到翻译结果');
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

