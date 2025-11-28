/**
 * 网页阅读器服务 - 使用 Dify AI API 读取网页内容
 */
import { stream } from './http';
import { parseSSEStream, SSEEventHandlers } from './translation';
import { get } from './http';

const DIFY_API_URL = 'https://api.dify.ai/v1/workflows/run';

/**
 * 获取 appKey（从服务器）
 */
async function getAppKey(): Promise<string> {
  try {
    // 根据 key_name 查询，默认使用 'web_reader' 作为 key_name
    const response = await get<{ success: boolean; appKey?: { app_key: string }; error?: string }>('/appkey/get/web_reader');
    if (!response.appKey) {
      throw new Error('无法获取 AppKey，请先配置');
    }
    return response.appKey.app_key;
  } catch (error) {
    console.error('获取 appKey 失败:', error);
    throw new Error('无法获取 AppKey，请先配置');
  }
}

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
    // 获取 appKey
    const appKey = await getAppKey();

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
          'Authorization': `Bearer ${appKey}`,
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
