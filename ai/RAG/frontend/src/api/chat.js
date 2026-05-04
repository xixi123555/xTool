import { fetchSSE } from '@/utils/sse'

const BASE_URL = 'http://127.0.0.1:9000'

/**
 * 流式发送消息给 AI，每解析出一个 SSEItem 就回调 onEvent。
 * 返回 AbortController 用于取消。
 */
export function chatStream(message, { onEvent, onError, onDone }) {
  return fetchSSE(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    onEvent: (event) => {
      if (onEvent && event.data) {
        onEvent(event.data)
      }
    },
    onDone,
    onError: (err) => {
      if (onError) onError(err)
    },
  })
}
