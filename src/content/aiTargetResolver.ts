import { chatCompletionOnce } from '../shared/aiClient'
import type { AIRequestConfig } from '../shared/aiConfig'
import { describeElement } from './elementContext'

const SKIP_TAGS = new Set([
  'HTML', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE',
])

const OUTLINE_SELECTORS = [
  'h1', 'h2', 'h3', 'h4',
  'nav', 'header', 'footer', 'main', 'section', 'article',
  'button', 'a[class*="btn"]', 'img', 'p',
  '[class*="title"]', '[class*="hero"]', '[class*="banner"]',
]

interface OutlineItem {
  el: HTMLElement
  line: string
}

interface PageOutline {
  items: OutlineItem[]
  text: string
}

export interface TargetResolveResult {
  element: HTMLElement | null
  wholePage: boolean
}

const TARGET_SYSTEM = `你是 HTML 页面编辑助手，负责根据用户描述判断要修改的**单个**页面元素。

你会收到用户请求和页面元素列表（带编号）。

只返回 JSON，不要 markdown，不要解释：
- {"index": 0} — 列表中最匹配的一项编号
- {"selector": "h1.title"} — 若编号不便，可用 CSS 选择器（须能唯一定位）
- {"wholePage": true} — 仅当用户明确要改整个页面/全站布局/全局背景时使用

默认选择**最小、最具体**的可改元素，不要返回 wholePage，除非用户明确说了整页/全站。`

const KEYWORD_RULES: { pattern: RegExp; selectors: string[] }[] = [
  { pattern: /标题|title|heading|headline/i, selectors: ['h1', 'h2', 'h3', '[class*="title"]', 'header h1', 'header h2'] },
  { pattern: /按钮|button/i, selectors: ['button', 'a[class*="btn"]', '[role="button"]', 'a.button'] },
  { pattern: /导航|navbar|menu/i, selectors: ['nav', 'header nav', '[class*="nav"]'] },
  { pattern: /页脚|footer/i, selectors: ['footer', '[class*="footer"]'] },
  { pattern: /图片|图像|image|banner/i, selectors: ['img', 'picture', '[class*="hero"]', '[class*="banner"]'] },
  { pattern: /段落|正文|文字|文本/i, selectors: ['p', 'article p', 'main p'] },
  { pattern: /链接|link/i, selectors: ['a', 'nav a'] },
]

export function isWholePageIntent(text: string): boolean {
  return /整(个)?页面|全页|整个网页|整个网站|whole\s*page|entire\s*page|全局背景|整站/i.test(text)
}

function isEditorNode(el: HTMLElement): boolean {
  return el.hasAttribute('data-htmlppt-editor') || !!el.closest('[data-htmlppt-editor]')
}

function isValidOutlineCandidate(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false
  if (el.tagName === 'BODY' || el.tagName === 'HTML') return false
  if (isEditorNode(el)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 4 || rect.height < 4) return false
  return true
}

function textSnippet(el: HTMLElement, max = 48): string {
  const raw = (el.innerText || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  return raw.length > max ? `${raw.slice(0, max)}…` : raw
}

export function buildPageOutline(max = 36): PageOutline {
  const seen = new Set<HTMLElement>()
  const items: OutlineItem[] = []

  for (const selector of OUTLINE_SELECTORS) {
    for (const node of document.querySelectorAll(selector)) {
      if (!(node instanceof HTMLElement)) continue
      if (!isValidOutlineCandidate(node)) continue
      if (seen.has(node)) continue
      seen.add(node)

      const snippet = textSnippet(node)
      const line = `[${items.length}] ${describeElement(node)}${snippet ? ` — "${snippet}"` : ''}`
      items.push({ el: node, line })
      if (items.length >= max) break
    }
    if (items.length >= max) break
  }

  return { items, text: items.map((i) => i.line).join('\n') }
}

function pickUnique(selector: string): HTMLElement | null {
  try {
    const matches = document.querySelectorAll(selector)
    if (matches.length !== 1) return null
    const el = matches[0]
    return el instanceof HTMLElement && isValidOutlineCandidate(el) ? el : null
  } catch {
    return null
  }
}

export function resolveTargetLocally(userText: string): HTMLElement | null {
  for (const rule of KEYWORD_RULES) {
    if (!rule.pattern.test(userText)) continue
    for (const selector of rule.selectors) {
      const el = pickUnique(selector)
      if (el) return el
    }
    const first = document.querySelector(rule.selectors[0])
    if (first instanceof HTMLElement && isValidOutlineCandidate(first)) return first
  }
  return null
}

function parseTargetReply(reply: string): {
  index?: number
  selector?: string
  wholePage?: boolean
} {
  const trimmed = reply.trim()
  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        index?: number
        selector?: string
        wholePage?: boolean
      }
      return parsed
    }
  } catch {
    /* ignore */
  }
  return {}
}

export async function resolveTargetElement(
  userText: string,
  config: AIRequestConfig,
): Promise<TargetResolveResult> {
  if (isWholePageIntent(userText)) {
    return { element: null, wholePage: true }
  }

  const local = resolveTargetLocally(userText)
  if (local) return { element: local, wholePage: false }

  const outline = buildPageOutline()
  if (!outline.items.length) {
    return { element: null, wholePage: false }
  }

  const reply = await chatCompletionOnce(config, [
    { role: 'system', content: TARGET_SYSTEM },
    {
      role: 'user',
      content: `用户请求：${userText}\n\n页面元素列表：\n${outline.text}`,
    },
  ])

  const parsed = parseTargetReply(reply)
  if (parsed.wholePage) return { element: null, wholePage: true }

  if (typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < outline.items.length) {
    return { element: outline.items[parsed.index].el, wholePage: false }
  }

  if (parsed.selector) {
    const el = pickUnique(parsed.selector)
    if (el) return { element: el, wholePage: false }
  }

  return { element: null, wholePage: false }
}
