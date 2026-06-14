import { createPickedElementData, describeElement, type PickedElementData } from './elementContext'
import { formatStackPath, getPickStack, nextDrillIndex, pickFromStack } from './elementPicker'

export class AIPickTool {
  private active = false
  private hoverBox: HTMLDivElement
  private label: HTMLDivElement
  private pickDrill = { x: 0, y: 0, stack: [] as HTMLElement[], index: 0, time: 0 }
  private hoverDrillIndex = 0
  private lastPointer = { x: 0, y: 0 }
  private lastPicked: HTMLElement | null = null
  private onPick: (data: PickedElementData) => void
  private onActiveChange: (active: boolean) => void

  private boundMove = this.onMove.bind(this)
  private boundClick = this.onClick.bind(this)
  private boundKey = this.onKey.bind(this)
  private boundScroll = () => this.hideHover()

  constructor(onPick: (data: PickedElementData) => void, onActiveChange: (active: boolean) => void) {
    this.onPick = onPick
    this.onActiveChange = onActiveChange

    this.hoverBox = document.createElement('div')
    this.hoverBox.setAttribute('data-htmlppt-editor', 'ai-pick-hover')
    this.hoverBox.className = 'htmlppt-ai-pick-hover'

    this.label = document.createElement('div')
    this.label.setAttribute('data-htmlppt-editor', 'ai-pick-label')
    this.label.className = 'htmlppt-ai-pick-label'

    document.documentElement.appendChild(this.hoverBox)
    document.documentElement.appendChild(this.label)
    this.hideHover()
  }

  isActive(): boolean {
    return this.active
  }

  toggle(): boolean {
    if (this.active) this.stop()
    else this.start()
    return this.active
  }

  start(): void {
    if (this.active) return
    this.active = true
    this.lastPicked = null
    this.hoverDrillIndex = 0
    document.body.classList.add('htmlppt-ai-picking')
    document.addEventListener('mousemove', this.boundMove, true)
    document.addEventListener('click', this.boundClick, true)
    document.addEventListener('keydown', this.boundKey, true)
    window.addEventListener('scroll', this.boundScroll, true)
    this.onActiveChange(true)
  }

  stop(): void {
    if (!this.active) return
    this.active = false
    document.body.classList.remove('htmlppt-ai-picking')
    document.removeEventListener('mousemove', this.boundMove, true)
    document.removeEventListener('click', this.boundClick, true)
    document.removeEventListener('keydown', this.boundKey, true)
    window.removeEventListener('scroll', this.boundScroll, true)
    this.hideHover()
    this.onActiveChange(false)
  }

  destroy(): void {
    this.stop()
    this.hoverBox.remove()
    this.label.remove()
  }

  private onMove(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (target.closest('[data-htmlppt-editor]')) {
      this.hideHover()
      return
    }

    const x = e.clientX
    const y = e.clientY
    if (Math.hypot(x - this.lastPointer.x, y - this.lastPointer.y) > 8) {
      this.hoverDrillIndex = 0
    }
    this.lastPointer = { x, y }

    const stack = getPickStack(x, y, 'ai')
    const el = pickFromStack(stack, this.hoverDrillIndex)
    if (el) this.showHover(el, stack)
    else this.hideHover()
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (target.closest('[data-htmlppt-editor]')) return

    e.preventDefault()
    e.stopPropagation()

    const stack = getPickStack(e.clientX, e.clientY, 'ai')
    if (stack.length === 0) return

    let index = this.hoverDrillIndex
    if (e.altKey && stack.length > 1) {
      index = Math.min(1, stack.length - 1)
    } else {
      index = nextDrillIndex(stack, this.pickDrill, e.clientX, e.clientY, this.lastPicked)
      if (this.hoverDrillIndex > 0 && index === 0) {
        index = this.hoverDrillIndex
      }
    }
    this.pickDrill = { x: e.clientX, y: e.clientY, stack, index, time: Date.now() }

    const el = pickFromStack(stack, index)
    if (!el) return

    this.lastPicked = el
    this.onPick(createPickedElementData(el))
    this.stop()
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.stop()
      return
    }

    if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1
      this.cycleHoverLevel(delta)
    }
  }

  private cycleHoverLevel(delta: number): void {
    const stack = getPickStack(this.lastPointer.x, this.lastPointer.y, 'ai')
    if (stack.length <= 1) return

    let newIndex = this.hoverDrillIndex + delta
    if (newIndex < 0) newIndex = stack.length - 1
    if (newIndex >= stack.length) newIndex = 0
    this.hoverDrillIndex = newIndex

    const el = pickFromStack(stack, newIndex)
    if (el) this.showHover(el, stack)
  }

  private showHover(el: HTMLElement, stack: HTMLElement[]): void {
    const rect = el.getBoundingClientRect()
    Object.assign(this.hoverBox.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
    const depth =
      stack.length > 1
        ? `  ${this.hoverDrillIndex + 1}/${stack.length}`
        : ''
    const path = stack.length > 1 ? ` · ${formatStackPath(stack, this.hoverDrillIndex)}` : ''
    this.label.textContent = `${describeElement(el)}${depth}${path} · Tab 切换`
    this.label.style.display = 'block'
    const labelTop = rect.top - 22
    Object.assign(this.label.style, {
      top: `${labelTop < 4 ? rect.bottom + 4 : labelTop}px`,
      left: `${rect.left}px`,
    })
  }

  private hideHover(): void {
    this.hoverBox.style.display = 'none'
    this.label.style.display = 'none'
  }
}
