export interface PickedElementData {
  pickId: string
  label: string
  html: string
  styles: string
}

export function createPickedElementData(el: HTMLElement): PickedElementData {
  const pickId = crypto.randomUUID()
  el.setAttribute('data-htmlppt-pick-id', pickId)
  return buildPickedElementData(el, pickId)
}

/** 已有 pickId 则复用，否则新建 */
export function getOrCreatePickData(el: HTMLElement): PickedElementData {
  const existing = el.getAttribute('data-htmlppt-pick-id')
  if (existing) return buildPickedElementData(el, existing)
  return createPickedElementData(el)
}

function buildPickedElementData(el: HTMLElement, pickId: string): PickedElementData {
  return {
    pickId,
    label: describeElement(el),
    html: truncate(el.outerHTML, 5000),
    styles: buildStyleSummary(el),
  }
}

export function describeElement(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls =
    typeof el.className === 'string' && el.className.trim()
      ? '.' +
        el.className
          .trim()
          .split(/\s+/)
          .filter((c) => c && !c.startsWith('htmlppt-'))
          .slice(0, 3)
          .join('.')
      : ''
  return `${tag}${id}${cls}`
}

export function formatPickForAI(pick: PickedElementData, userText: string): string {
  const parts = [
    userText || '请修改以下目标元素',
    '',
    `目标元素：${pick.label}`,
    '```html',
    pick.html,
    '```',
  ]
  if (pick.styles) parts.push('', `当前样式：${pick.styles}`)
  parts.push(
    '',
    '请只返回修改后的该元素 HTML（单个根元素），不要返回整个页面。',
    '只改用户要求的部分（如字体、颜色），保留元素内原有文本和子节点结构。',
  )
  return parts.join('\n')
}

function buildStyleSummary(el: HTMLElement): string {
  const parts: string[] = []
  const inline = el.getAttribute('style')?.trim()
  if (inline) parts.push(inline.replace(/;\s*$/, ''))

  const cs = getComputedStyle(el)
  const keys = [
    'display',
    'position',
    'width',
    'height',
    'margin',
    'padding',
    'color',
    'background-color',
    'font-size',
    'font-family',
    'font-weight',
    'text-align',
    'border',
    'border-radius',
    'flex',
    'gap',
    'opacity',
    'transform',
  ]

  for (const key of keys) {
    const value = cs.getPropertyValue(key)
    if (!value || value === 'none' || value === 'auto' || value === 'normal') continue
    if (value === 'rgba(0, 0, 0, 0)' || value === 'transparent') continue
    parts.push(`${key}: ${value}`)
  }

  return parts.join('; ')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '\n<!-- ... 已截断 ... -->'
}
