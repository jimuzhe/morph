import type { AIRequestConfig } from './aiConfig'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamHandlers {
  onChunk: (delta: string, content: string) => void
  onDone: (content: string) => void
  onError: (error: string) => void
}

/** 流式对话，返回取消函数 */
export function chatCompletionStream(
  config: AIRequestConfig,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): () => void {
  const port = chrome.runtime.connect({ name: 'AI_CHAT_STREAM' })
  let finished = false

  const finish = (): void => {
    if (finished) return
    finished = true
    try {
      port.disconnect()
    } catch {
      // ignore
    }
  }

  port.onMessage.addListener((msg: { type: string; delta?: string; content?: string; error?: string }) => {
    if (msg.type === 'chunk' && msg.content != null) {
      handlers.onChunk(msg.delta ?? '', msg.content)
    } else if (msg.type === 'done' && msg.content != null) {
      handlers.onDone(msg.content)
      finish()
    } else if (msg.type === 'error') {
      handlers.onError(msg.error ?? '请求失败')
      finish()
    }
  })

  port.onDisconnect.addListener(() => {
    if (!finished) handlers.onError('连接已断开')
    finished = true
  })

  port.postMessage({ type: 'START', config, messages })
  return finish
}

/** 非流式单次对话 */
export function chatCompletionOnce(
  config: AIRequestConfig,
  messages: ChatMessage[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connect({ name: 'AI_CHAT_ONCE' })
    let finished = false

    const finish = (): void => {
      if (finished) return
      finished = true
      try {
        port.disconnect()
      } catch {
        /* ignore */
      }
    }

    port.onMessage.addListener((msg: { type: string; content?: string; error?: string }) => {
      if (msg.type === 'done' && msg.content != null) {
        resolve(msg.content)
        finish()
      } else if (msg.type === 'error') {
        reject(new Error(msg.error ?? '请求失败'))
        finish()
      }
    })

    port.onDisconnect.addListener(() => {
      if (!finished) reject(new Error('连接已断开'))
      finished = true
    })

    port.postMessage({ type: 'START', config, messages })
  })
}

export function extractHtmlFromResponse(text: string): string | null {
  const fence = text.match(/```(?:html)?\s*\n([\s\S]*?)```/i)
  if (fence) return fence[1].trim()

  if (text.trim().startsWith('<') && text.includes('>')) {
    return text.trim()
  }

  return null
}

/** 去掉 HTML 代码块，保留 AI 的自然语言说明 */
export function extractReplyText(text: string): string {
  let result = text.replace(/```(?:html)?\s*\n[\s\S]*?```/gi, '').trim()
  if (result.startsWith('<') && result.includes('>') && !result.includes('\n')) {
    result = ''
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function buildSystemPrompt(scoped = false): string {
  if (scoped) {
    return `你是 HTMLPPT Editor 的 AI 编辑助手。

用户会指定一个**目标元素**及其 HTML。你只修改该元素。

规则：
1. 需要改页面时，在回复末尾附上**修改后的该元素完整 HTML**（仅一个根元素），用 \`\`\`html 代码块包裹。
2. 不要返回整个页面、不要返回 <body> 或页面片段，只返回目标元素本身。
3. 保留元素原有的 id、class、内部子节点与文本（除非用户要求修改）。
4. 用户只要求改字体、颜色、对齐等样式时，只改 style / class，不要删掉元素内容或替换成别的结构。
5. 优先使用内联 style。
6. 仅问答、不需改页面时，用自然语言回答，不要输出 HTML 代码块。
7. **需要改页面时**：先用 1～3 句自然语言说明做了什么、改动效果或注意点，再在末尾附 HTML 代码块；不要只返回代码。
8. 语气友好、简洁，像同事在确认改完了，例如「标题已换成衬线字体，看起来更正式了。」
9. 用中文与用户交流。`
  }

  return `你是 HTMLPPT Editor 的 AI 编辑助手（类似 Copilot），帮助用户用自然语言修改 HTML 页面。

规则：
1. 当用户要求修改、生成、调整页面内容时，在回复末尾附上完整的 <body> 内部 HTML，用 \`\`\`html 代码块包裹。
2. 只做用户要求的修改，保留其余结构和样式；优先使用内联 style。
3. **严禁**只返回被修改的局部元素（例如仅一个 <h1> 标题）。必须返回完整 body 内容，其余未提及的元素保持原样。
4. 用户说「改标题」「改按钮」等局部修改时：在完整 body 中只改对应部分，其他所有节点必须与原文一致。
5. 如果用户只是提问、不需要改页面，用自然语言回答，不要输出 HTML 代码块。
6. 代码块中只放 body 内部的 HTML，不要包含 <html>、<head>、<body> 标签。
7. **需要改页面时**：先用 1～3 句自然语言说明做了什么、改动效果或注意点，再在末尾附 HTML 代码块；不要只返回代码。
8. 语气友好、简洁，像同事在确认改完了。
9. 用中文与用户交流。`
}
