/**
 * 解析 SSE (Server-Sent Events) 文本流，逐事件返回 JSON 对象。
 *
 * 使用方式：
 *   const parser = createSSEParser()
 *   for (const chunk of textChunks) {
 *     for (const event of parser.parse(chunk)) {
 *       console.log(event)
 *     }
 *   }
 *
 * 每个 event 为 { type?, id?, data }，data 已 JSON.parse 为对象。
 */

export function createSSEParser() {
  let buffer = ''

  function parseChunk(chunk) {
    buffer += chunk
    const events = []
    const parts = buffer.split('\n\n')

    // 最后一段可能不完整，留到下次处理
    buffer = parts.pop()

    for (const part of parts) {
      const event = parseEventBlock(part)
      if (event) events.push(event)
    }

    return events
  }

  function parseEventBlock(block) {
    if (!block.trim()) return null

    const result = {}
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue

      const field = line.slice(0, colonIdx).trim()
      let value = line.slice(colonIdx + 1)
      // 跳过值前面的一个空格
      if (value.startsWith(' ')) value = value.slice(1)

      result[field] = value
    }

    if (result.data == null) return null

    try {
      result.data = JSON.parse(result.data)
    } catch {
      // 非 JSON 字符串原样保留
    }

    return result
  }

  return { parse: parseChunk }
}

/**
 * 通过 fetch 读取 SSE 流，每解析出一个事件就调用 onEvent 回调。
 * 返回 AbortController，可用于取消请求。
 */
export function fetchSSE(url, { method = 'GET', headers = {}, body, onEvent, onError, onDone }) {
  const controller = new AbortController()
  const parser = createSSEParser()

  fetch(url, {
    method,
    headers: { ...headers, Accept: 'text/event-stream' },
    body,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const event of parser.parse(chunk)) {
          onEvent(event)
        }
      }
      if (onDone) onDone()
    })
    .catch((err) => {
      if (err.name !== 'AbortError' && onError) {
        onError(err)
      }
      if (onDone) onDone()
    })

  return controller
}
