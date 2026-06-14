chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return

  const blocked = ['chrome:', 'edge:', 'about:', 'chrome-extension:'].some((p) =>
    tab.url!.startsWith(p),
  )
  if (blocked) return

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'HTMLOPT_TOGGLE' })
  } catch {
    console.warn('[HTMLPPT] Content script not ready, please refresh the page.')
  }
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'AI_CHAT_STREAM') {
    port.onMessage.addListener((message) => {
      if (message?.type !== 'START') return
      void streamAIChat(port, message.config, message.messages, true)
    })
    return
  }

  if (port.name === 'AI_CHAT_ONCE') {
    port.onMessage.addListener((message) => {
      if (message?.type !== 'START') return
      void streamAIChat(port, message.config, message.messages, false)
    })
  }
})

interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface ChatMessage {
  role: string
  content: string
}

type StreamPort = chrome.runtime.Port

async function streamAIChat(
  port: StreamPort,
  config: AIConfig,
  messages: ChatMessage[],
  stream = true,
): Promise<void> {
  try {
    if (!config.apiKey?.trim()) {
      throw new Error('请先在 AI 面板设置中填写 API Key')
    }

    const base = normalizeBaseUrl(config.baseUrl)
    const url = `${base}/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: stream ? 0.4 : 0.2,
        stream,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`API 请求失败 (${response.status}): ${errText.slice(0, 200)}`)
    }

    if (!stream) {
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const content = json.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('模型未返回内容')
      port.postMessage({ type: 'done', content })
      return
    }

    if (!response.body) throw new Error('API 未返回流式数据')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue

        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[]
          }
          const delta = json.choices?.[0]?.delta?.content ?? ''
          if (!delta) continue
          full += delta
          port.postMessage({ type: 'chunk', delta, content: full })
        } catch {
          // 跳过无法解析的行
        }
      }
    }

    if (!full) throw new Error('模型未返回内容')
    port.postMessage({ type: 'done', content: full })
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求失败'
    port.postMessage({ type: 'error', error: message })
  }
}

function normalizeBaseUrl(url: string): string {
  const base = url.replace(/\/+$/, '')
  if (base.endsWith('/v1')) return base
  if (base.includes('deepseek.com')) return `${base}/v1`
  return base
}
