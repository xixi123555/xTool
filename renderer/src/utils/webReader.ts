/**
 * 网页阅读器服务 - 使用 Dify AI API 读取网页内容
 */
import { stream } from './http';
import { parseSSEStream, SSEEventHandlers } from './translation';

const DIFY_API_URL = 'https://api.dify.ai/v1/workflows/run';

/**
 * 读取网页内容（流式响应）
 */
export async function readWebPage(
  url: string,
  onChunk: (chunk: string) => void,
  onComplete: (result: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    // 使用 HTTP 模块的 stream 方法发送请求
    const response = await stream(
      DIFY_API_URL,
      {
        inputs: { input_url: url },
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
        throw new Error('未收到网页内容');
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

