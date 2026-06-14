export class SelectionOverlay {
  private hoverBox: HTMLDivElement
  private selectedBox: HTMLDivElement
  private label: HTMLDivElement
  private resizeHandles: HTMLDivElement
  private onResizeStart: ((dir: string, e: MouseEvent) => void) | null = null
  private onMoveStart: ((e: MouseEvent) => void) | null = null
  private movable = true
  private lastDepth?: { index: number; total: number }

  constructor() {
    this.hoverBox = this.createBox('hover')
    this.selectedBox = this.createBox('selected')
    this.selectedBox.addEventListener('mousedown', (e) => {
      if (!this.movable) return
      e.preventDefault()
      e.stopPropagation()
      this.onMoveStart?.(e)
    })

    this.label = document.createElement('div')
    this.label.setAttribute('data-htmlppt-editor', 'label')
    this.label.className = 'htmlppt-inspector-label'

    this.resizeHandles = document.createElement('div')
    this.resizeHandles.setAttribute('data-htmlppt-editor', 'resize')
    this.resizeHandles.className = 'htmlppt-resize-handles'
    for (const dir of ['nw', 'ne', 'se', 'sw']) {
      const h = document.createElement('div')
      h.className = `htmlppt-resize-handle htmlppt-resize-${dir}`
      h.dataset.dir = dir
      h.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.onResizeStart?.(dir, e)
      })
      this.resizeHandles.appendChild(h)
    }

    this.label.style.cursor = 'move'
    this.label.title = '拖拽移动'
    this.label.addEventListener('mousedown', (e) => {
      if (!this.movable) return
      e.preventDefault()
      e.stopPropagation()
      this.onMoveStart?.(e)
    })

    document.documentElement.appendChild(this.hoverBox)
    document.documentElement.appendChild(this.selectedBox)
    document.documentElement.appendChild(this.label)
    document.documentElement.appendChild(this.resizeHandles)
    this.hideAll()
  }

  setResizeHandler(fn: (dir: string, e: MouseEvent) => void): void {
    this.onResizeStart = fn
  }

  setMoveHandler(fn: (e: MouseEvent) => void): void {
    this.onMoveStart = fn
  }

  setMovable(movable: boolean): void {
    this.movable = movable
    this.syncMoveUi()
  }

  private syncMoveUi(): void {
    this.selectedBox.style.pointerEvents = this.movable ? 'auto' : 'none'
    this.selectedBox.style.cursor = this.movable ? 'move' : 'default'
    if (this.movable) {
      this.label.style.cursor = 'move'
      this.label.title = '拖拽移动'
    } else {
      this.label.style.cursor = ''
      this.label.title = ''
    }
  }

  showHover(el: HTMLElement, depth?: { index: number; total: number }): void {
    this.positionBox(this.hoverBox, el)
    this.hoverBox.style.display = 'block'
    if (depth) {
      this.updateHoverLabel(el, depth)
    } else {
      this.hideHoverLabel()
    }
  }

  private hoverLabel: HTMLDivElement | null = null

  private ensureHoverLabel(): HTMLDivElement {
    if (!this.hoverLabel) {
      this.hoverLabel = document.createElement('div')
      this.hoverLabel.setAttribute('data-htmlppt-editor', 'hover-label')
      this.hoverLabel.className = 'htmlppt-inspector-hover-label'
      document.documentElement.appendChild(this.hoverLabel)
    }
    return this.hoverLabel
  }

  private updateHoverLabel(el: HTMLElement, depth: { index: number; total: number }): void {
    const label = this.ensureHoverLabel()
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    label.textContent = `${tag}  ${depth.index}/${depth.total} · Tab 切换层级`
    label.style.display = 'block'
    const labelTop = rect.top - 22
    Object.assign(label.style, {
      top: `${labelTop < 4 ? rect.bottom + 4 : labelTop}px`,
      left: `${rect.left}px`,
    })
  }

  private hideHoverLabel(): void {
    if (this.hoverLabel) this.hoverLabel.style.display = 'none'
  }

  hideHover(): void {
    this.hoverBox.style.display = 'none'
    this.hideHoverLabel()
  }

  showSelected(el: HTMLElement, depth?: { index: number; total: number }): void {
    this.positionBox(this.selectedBox, el)
    this.selectedBox.style.display = 'block'
    this.updateLabel(el, depth)
    this.positionHandles(el)
    this.syncMoveUi()
    this.resizeHandles.style.display = 'block'
  }

  updateSelected(el: HTMLElement): void {
    if (this.selectedBox.style.display === 'none') return
    this.positionBox(this.selectedBox, el)
    this.updateLabel(el, this.lastDepth)
    this.positionHandles(el)
    this.syncMoveUi()
  }

  hideSelected(): void {
    this.selectedBox.style.display = 'none'
    this.label.style.display = 'none'
    this.resizeHandles.style.display = 'none'
    this.lastDepth = undefined
  }

  hideAll(): void {
    this.hideHover()
    this.hideSelected()
  }

  destroy(): void {
    this.hoverBox.remove()
    this.selectedBox.remove()
    this.label.remove()
    this.resizeHandles.remove()
    this.hoverLabel?.remove()
  }

  private createBox(type: 'hover' | 'selected'): HTMLDivElement {
    const box = document.createElement('div')
    box.setAttribute('data-htmlppt-editor', `overlay-${type}`)
    box.className = `htmlppt-inspector-box htmlppt-inspector-${type}`
    return box
  }

  private positionBox(box: HTMLDivElement, el: HTMLElement): void {
    const rect = el.getBoundingClientRect()
    Object.assign(box.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  private positionHandles(el: HTMLElement): void {
    const rect = el.getBoundingClientRect()
    Object.assign(this.resizeHandles.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  private updateLabel(el: HTMLElement, depth?: { index: number; total: number }): void {
    if (depth) this.lastDepth = depth
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).filter(c => !c.startsWith('htmlppt-')).slice(0, 2).join('.')
      : ''
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    const depthText = depth ? `  ${depth.index}/${depth.total}` : this.lastDepth ? `  ${this.lastDepth.index}/${this.lastDepth.total}` : ''

    this.label.textContent = `${tag}${id}${cls}  ${w} × ${h}${depthText}`
    this.label.style.display = 'block'

    const labelTop = rect.top - 22
    const top = labelTop < 4 ? rect.bottom + 4 : labelTop
    Object.assign(this.label.style, {
      top: `${top}px`,
      left: `${rect.left}px`,
    })
  }
}
