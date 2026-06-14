import { TOOL_ICONS, ICON_COLLAPSE, ICON_GRIP } from './icons'

export type ToolId = 'select' | 'text' | 'image' | 'delete' | 'ai' | 'undo' | 'redo' | 'save' | 'close'

/** 会启用页面元素点选的工具 */
export type PickToolId = 'select' | 'text'

export interface ToolbarCallbacks {
  onTool: (tool: ToolId, activeTool: ToolId | null) => void
}

const TOOLS: { id: ToolId; label: string; group?: number }[] = [
  { id: 'select', label: '选择移动', group: 1 },
  { id: 'text', label: '编辑文字', group: 1 },
  { id: 'image', label: '替换图片', group: 1 },
  { id: 'delete', label: '删除元素', group: 1 },
  { id: 'ai', label: 'AI 助手', group: 2 },
  { id: 'undo', label: '撤销', group: 2 },
  { id: 'redo', label: '重做', group: 2 },
  { id: 'save', label: '保存', group: 3 },
  { id: 'close', label: '退出', group: 3 },
]

const TOOLBAR_POS_KEY = 'htmlppt-toolbar-pos'
const DRAG_BALL_SIZE = 48
const EDGE_SNAP_THRESHOLD = 80

type ToolbarEdge = 'left' | 'right' | 'none'

export class FloatingToolbar {
  private root: HTMLDivElement
  private panel: HTMLDivElement
  private inner: HTMLDivElement
  private dragOrb: HTMLDivElement
  private dragHandle: HTMLDivElement
  private statusEl: HTMLDivElement
  private fab: HTMLButtonElement
  private callbacks: ToolbarCallbacks
  private collapsed = false
  private pos = { left: 0, top: 0 }
  private edge: ToolbarEdge = 'none'

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks
    this.root = document.createElement('div')
    this.root.setAttribute('data-htmlppt-editor', 'toolbar')
    this.root.className = 'htmlppt-toolbar'

    this.panel = document.createElement('div')
    this.panel.className = 'htmlppt-toolbar-panel'

    this.dragOrb = document.createElement('div')
    this.dragOrb.className = 'htmlppt-toolbar-drag-orb'
    this.dragOrb.setAttribute('aria-hidden', 'true')
    const dragOrbIcon = document.createElement('img')
    dragOrbIcon.className = 'htmlppt-toolbar-drag-orb-icon'
    dragOrbIcon.src = chrome.runtime.getURL('icons/icon48.png')
    dragOrbIcon.alt = ''
    this.dragOrb.appendChild(dragOrbIcon)

    this.inner = document.createElement('div')
    this.inner.className = 'htmlppt-toolbar-inner'

    this.dragHandle = document.createElement('div')
    this.dragHandle.className = 'htmlppt-toolbar-drag-handle'
    this.dragHandle.title = '拖拽移动'
    this.dragHandle.setAttribute('aria-label', '拖拽移动工具栏')
    this.dragHandle.innerHTML = ICON_GRIP
    this.inner.appendChild(this.dragHandle)
    this.inner.appendChild(this.createDivider())

    const collapseBtn = document.createElement('button')
    collapseBtn.className = 'htmlppt-tool-btn htmlppt-collapse-btn'
    collapseBtn.setAttribute('title', '收起为小球')
    collapseBtn.setAttribute('aria-label', '收起为小球')
    collapseBtn.innerHTML = `<span class="htmlppt-tool-icon">${ICON_COLLAPSE}</span>`
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.setCollapsed(true)
    })
    this.inner.appendChild(collapseBtn)
    this.inner.appendChild(this.createDivider())

    const groups: ToolId[][] = [
      ['select', 'text', 'image', 'delete'],
      ['ai', 'undo', 'redo'],
      ['save', 'close'],
    ]

    groups.forEach((groupIds, index) => {
      for (const id of groupIds) {
        const tool = TOOLS.find((t) => t.id === id)!
        this.inner.appendChild(this.createButton(tool))
      }
      if (index < groups.length - 1) {
        this.inner.appendChild(this.createDivider())
      }
    })

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'htmlppt-toolbar-status'

    this.panel.appendChild(this.dragOrb)
    this.panel.appendChild(this.inner)
    this.panel.appendChild(this.statusEl)

    this.fab = document.createElement('button')
    this.fab.className = 'htmlppt-fab'
    this.fab.setAttribute('data-htmlppt-editor', 'fab')
    this.fab.setAttribute('title', '展开工具栏（可拖拽）')
    this.fab.setAttribute('aria-label', '展开工具栏')
    const fabIcon = document.createElement('img')
    fabIcon.className = 'htmlppt-fab-icon'
    fabIcon.src = chrome.runtime.getURL('icons/icon48.png')
    fabIcon.alt = 'HTMLPPT'
    this.fab.appendChild(fabIcon)

    this.root.appendChild(this.panel)
    this.root.appendChild(this.fab)

    this.setupDrag()
    this.setupFabInteraction()
  }

  mount(): void {
    document.documentElement.appendChild(this.root)
    requestAnimationFrame(() => {
      const saved = this.loadPosition()
      if (saved) {
        this.setPosition(saved)
        this.applyEdgeLayout(false)
        this.setPosition(this.pos)
      } else {
        this.centerBottom()
      }
      this.root.classList.add('htmlppt-toolbar-visible')
    })
  }

  unmount(): void {
    this.root.classList.remove('htmlppt-toolbar-visible')
    setTimeout(() => this.root.remove(), 250)
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed
    this.root.classList.toggle('htmlppt-toolbar-collapsed', collapsed)
    requestAnimationFrame(() => this.clampToViewport())
  }

  isCollapsed(): boolean {
    return this.collapsed
  }

  setActiveTool(tool: ToolId | null): void {
    this.inner.querySelectorAll('.htmlppt-tool-btn[data-tool]').forEach((btn) => {
      const id = btn.getAttribute('data-tool')
      btn.classList.toggle('active', tool !== null && id === tool)
    })
  }

  getActiveTool(): ToolId | null {
    const active = this.inner.querySelector('.htmlppt-tool-btn[data-tool].active')
    return (active?.getAttribute('data-tool') as ToolId) ?? null
  }

  clearActiveTools(): void {
    this.setActiveTool(null)
  }

  setStatus(text: string, type: 'info' | 'success' | 'error' = 'info'): void {
    this.statusEl.textContent = text
    this.statusEl.className = `htmlppt-toolbar-status htmlppt-status-${type}`
    if (text) {
      clearTimeout((this.statusEl as unknown as { _t?: number })._t)
      ;(this.statusEl as unknown as { _t?: number })._t = window.setTimeout(() => {
        this.statusEl.textContent = ''
        this.statusEl.className = 'htmlppt-toolbar-status'
      }, 2500)
    }
  }

  private setupDrag(): void {
    this.dragHandle.addEventListener('pointerdown', (e) => {
      this.startPointerDrag(e, { morphToBall: !this.collapsed })
    })
  }

  private setupFabInteraction(): void {
    this.fab.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      const startX = e.clientX
      const startY = e.clientY
      let dragging = false

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (!dragging && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        if (!dragging) {
          dragging = true
          this.root.classList.add('htmlppt-toolbar-dragging')
        }
        this.setPosition({
          left: ev.clientX - DRAG_BALL_SIZE / 2,
          top: ev.clientY - DRAG_BALL_SIZE / 2,
        })
      }

      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        this.root.classList.remove('htmlppt-toolbar-dragging')
        if (dragging) {
          this.applyEdgeLayout(true)
          this.playReleaseAnimation()
          this.clampToViewport()
          this.savePosition()
        } else if (this.collapsed) {
          this.setCollapsed(false)
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    })
  }

  private startPointerDrag(e: PointerEvent, options: { morphToBall: boolean }): void {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const rect = this.root.getBoundingClientRect()
    const anchorX = options.morphToBall ? DRAG_BALL_SIZE / 2 : e.clientX - rect.left
    const anchorY = options.morphToBall ? DRAG_BALL_SIZE / 2 : e.clientY - rect.top

    this.root.classList.add('htmlppt-toolbar-dragging')
    if (options.morphToBall) {
      this.root.classList.add('htmlppt-toolbar-drag-morph')
    }

    this.setPosition({
      left: e.clientX - anchorX,
      top: e.clientY - anchorY,
    })

    const onMove = (ev: PointerEvent) => {
      this.setPosition({
        left: ev.clientX - anchorX,
        top: ev.clientY - anchorY,
      })
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      this.root.classList.remove('htmlppt-toolbar-dragging', 'htmlppt-toolbar-drag-morph')
      this.applyEdgeLayout(true)
      this.playReleaseAnimation()
      this.clampToViewport()
      this.savePosition()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  private playReleaseAnimation(): void {
    this.root.classList.add('htmlppt-toolbar-expanding')
    window.setTimeout(() => {
      this.root.classList.remove('htmlppt-toolbar-expanding')
    }, 560)
  }

  private centerBottom(): void {
    const w = this.root.offsetWidth || 320
    const h = this.root.offsetHeight || 48
    this.setPosition({
      left: (window.innerWidth - w) / 2,
      top: window.innerHeight - h - 28,
    })
  }

  private clampToViewport(): void {
    this.applyEdgeLayout(false)
    this.setPosition(this.pos)
  }

  /** 贴左/右竖边时切换为纵向工具栏 */
  private applyEdgeLayout(snap: boolean): void {
    const margin = 8
    const draggingBall =
      this.root.classList.contains('htmlppt-toolbar-drag-morph') ||
      (this.root.classList.contains('htmlppt-toolbar-dragging') && this.collapsed)
    const w = draggingBall ? DRAG_BALL_SIZE : this.root.offsetWidth || 48
    const distLeft = this.pos.left
    const distRight = window.innerWidth - this.pos.left - w

    let edge: ToolbarEdge = 'none'
    if (snap) {
      if (distLeft <= EDGE_SNAP_THRESHOLD) edge = 'left'
      else if (distRight <= EDGE_SNAP_THRESHOLD) edge = 'right'
    } else {
      if (this.edge === 'left' && distLeft <= EDGE_SNAP_THRESHOLD + 24) edge = 'left'
      else if (this.edge === 'right' && distRight <= EDGE_SNAP_THRESHOLD + 24) edge = 'right'
      else if (distLeft <= EDGE_SNAP_THRESHOLD) edge = 'left'
      else if (distRight <= EDGE_SNAP_THRESHOLD) edge = 'right'
    }

    this.edge = edge
    const vertical = edge !== 'none'
    this.root.classList.toggle('htmlppt-toolbar-vertical', vertical)
    this.root.classList.toggle('htmlppt-toolbar-edge-left', edge === 'left')
    this.root.classList.toggle('htmlppt-toolbar-edge-right', edge === 'right')

    if (snap && edge === 'left') {
      this.pos.left = margin
    } else if (snap && edge === 'right') {
      const newW = draggingBall ? DRAG_BALL_SIZE : this.root.offsetWidth || w
      this.pos.left = window.innerWidth - newW - margin
    }
  }

  private setPosition(pos: { left: number; top: number }): void {
    const margin = 8
    const draggingBall =
      this.root.classList.contains('htmlppt-toolbar-drag-morph') ||
      (this.root.classList.contains('htmlppt-toolbar-dragging') && this.collapsed)
    const w = draggingBall ? DRAG_BALL_SIZE : this.root.offsetWidth || 48
    const h = draggingBall ? DRAG_BALL_SIZE : this.root.offsetHeight || 48
    const left = Math.max(margin, Math.min(pos.left, window.innerWidth - w - margin))
    const top = Math.max(margin, Math.min(pos.top, window.innerHeight - h - margin))
    this.pos = { left, top }
    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
    this.root.style.bottom = 'auto'
    this.root.style.right = 'auto'
    this.root.style.transform = 'none'
  }

  private loadPosition(): { left: number; top: number; edge?: ToolbarEdge } | null {
    try {
      const raw = sessionStorage.getItem(TOOLBAR_POS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { left?: number; top?: number; edge?: ToolbarEdge }
      if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null
      if (parsed.edge === 'left' || parsed.edge === 'right') this.edge = parsed.edge
      return { left: parsed.left, top: parsed.top, edge: parsed.edge }
    } catch {
      return null
    }
  }

  private savePosition(): void {
    sessionStorage.setItem(
      TOOLBAR_POS_KEY,
      JSON.stringify({ left: this.pos.left, top: this.pos.top, edge: this.edge }),
    )
  }

  private createDivider(): HTMLDivElement {
    const divider = document.createElement('div')
    divider.className = 'htmlppt-toolbar-divider'
    divider.setAttribute('aria-hidden', 'true')
    return divider
  }

  private createButton(tool: { id: ToolId; label: string }): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'htmlppt-tool-btn'
    btn.setAttribute('data-tool', tool.id)
    btn.setAttribute('title', tool.label)
    btn.setAttribute('aria-label', tool.label)
    btn.innerHTML = `<span class="htmlppt-tool-icon">${TOOL_ICONS[tool.id]}</span>`
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const isToggleTool = tool.id === 'select' || tool.id === 'text'
      if (isToggleTool) {
        const alreadyActive = this.getActiveTool() === tool.id
        this.setActiveTool(alreadyActive ? null : tool.id)
      }
      this.callbacks.onTool(tool.id, this.getActiveTool())
    })
    return btn
  }
}
