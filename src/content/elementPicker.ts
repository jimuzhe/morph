const SKIP_TAGS = new Set(['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE'])

const TEXT_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'SPAN', 'A', 'BUTTON', 'LABEL', 'LI', 'TD', 'TH',
  'FIGCAPTION', 'BLOCKQUOTE', 'EM', 'STRONG', 'B', 'I', 'U', 'S',
  'SMALL', 'SUB', 'SUP', 'CODE', 'MARK', 'DT', 'DD', 'LEGEND',
])

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY'])

export type PickMode = 'select' | 'text' | 'ai'

function isEditorNode(el: HTMLElement): boolean {
  return el.hasAttribute('data-htmlppt-editor') || !!el.closest('[data-htmlppt-editor]')
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function isInteractive(el: HTMLElement): boolean {
  if (INTERACTIVE_TAGS.has(el.tagName)) return true
  const role = el.getAttribute('role')
  if (role === 'button' || role === 'link' || role === 'menuitem' || role === 'tab') return true
  return el.tabIndex >= 0
}

function isValidCandidate(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false
  if (el.tagName === 'BODY' || el.tagName === 'HTML') return false
  if (isEditorNode(el)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return false
  return true
}

function hasMeaningfulText(el: HTMLElement): boolean {
  const text = el.innerText?.trim()
  return !!text && text.length > 0
}

function isTextPickTarget(el: HTMLElement): boolean {
  if (TEXT_TAGS.has(el.tagName)) return true
  if (el.tagName === 'IMG') return false
  if (el.children.length === 0 && hasMeaningfulText(el)) return true
  return false
}

/** 在容器内沿 DOM 向下钻取：坐标落在哪个最小/最具体的子元素上 */
function refineToDeepestChild(el: HTMLElement, x: number, y: number): HTMLElement {
  let current = el

  for (;;) {
    let bestChild: HTMLElement | null = null
    let bestScore = Infinity

    for (const child of current.children) {
      if (!(child instanceof HTMLElement)) continue
      if (!isValidCandidate(child)) continue
      const rect = child.getBoundingClientRect()
      if (!pointInRect(x, y, rect)) continue

      const area = rect.width * rect.height
      const score = isInteractive(child) ? area * 0.01 : area
      if (score < bestScore) {
        bestScore = score
        bestChild = child
      }
    }

    if (!bestChild) break
    current = bestChild
  }

  return current
}

function collectHitTestRoots(x: number, y: number): HTMLElement[] {
  const roots: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  const push = (node: Element | null) => {
    if (!(node instanceof HTMLElement)) return
    if (!isValidCandidate(node)) return
    if (seen.has(node)) return
    seen.add(node)
    roots.push(node)
  }

  for (const node of document.elementsFromPoint(x, y)) {
    push(node)
  }

  push(document.elementFromPoint(x, y))

  return roots
}

function getDeepestAtPoint(x: number, y: number): HTMLElement | null {
  const roots = collectHitTestRoots(x, y)
  if (roots.length === 0) return null

  let finest: HTMLElement | null = null
  let finestScore = Infinity

  for (const root of roots) {
    const refined = refineToDeepestChild(root, x, y)
    const rect = refined.getBoundingClientRect()
    const area = rect.width * rect.height
    const score = isInteractive(refined) ? area * 0.01 : area
    if (score < finestScore) {
      finestScore = score
      finest = refined
    }
  }

  return finest
}

/**
 * 鼠标位置下的候选栈：index 0 = 最具体子元素，index 增大 = 逐级父级。
 * 同位置连点可在子 → 父之间切换。
 */
export function getPickStack(x: number, y: number, mode: PickMode): HTMLElement[] {
  const deepest = getDeepestAtPoint(x, y)
  if (!deepest) return []

  const stack: HTMLElement[] = []
  let el: HTMLElement | null = deepest
  while (el && el !== document.body && el !== document.documentElement) {
    if (isValidCandidate(el)) stack.push(el)
    el = el.parentElement
  }

  if (mode === 'text') {
    const textTargets = stack.filter(isTextPickTarget)
    if (textTargets.length > 0) return textTargets
  }

  return stack
}

/** 层级路径描述，如 button → nav → header */
export function formatStackPath(stack: HTMLElement[], index: number): string {
  if (stack.length === 0) return ''
  const i = Math.max(0, Math.min(index, stack.length - 1))
  return stack
    .slice(0, i + 1)
    .map((el) => el.tagName.toLowerCase())
    .join(' → ')
}

export function pickFromStack(stack: HTMLElement[], index: number): HTMLElement | null {
  if (stack.length === 0) return null
  const i = ((index % stack.length) + stack.length) % stack.length
  return stack[i]
}

/** 同一位置连点：在候选层级间循环（子 → 父） */
export function nextDrillIndex(
  stack: HTMLElement[],
  prev: { x: number; y: number; stack: HTMLElement[]; index: number; time: number },
  x: number,
  y: number,
  current: HTMLElement | null,
): number {
  const sameSpot = Math.hypot(x - prev.x, y - prev.y) < 8
  const recent = Date.now() - prev.time < 700
  const sameStack =
    stack.length === prev.stack.length && stack.every((el, i) => el === prev.stack[i])

  if (!sameSpot || !recent || !sameStack) return 0

  if (current && stack.includes(current)) {
    return (stack.indexOf(current) + 1) % stack.length
  }

  return (prev.index + 1) % stack.length
}
