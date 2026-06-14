import { AIWorkOverlay, type AIWorkScope } from './AIWorkOverlay'
import { FloatingToolbar, type ToolId, type PickToolId } from './FloatingToolbar'
import { SelectionOverlay } from './SelectionOverlay'
import { PropertyPanel } from './PropertyPanel'
import { AIChatPanel } from './AIChatPanel'
import { isLocalPage, isOnlinePage, localizeCurrentPage } from '../shared/htmlDocument'
import { autoSavePage, canAutoSaveHere, ensureFileLinked, isFileLinked, savePage } from '../shared/fileSave'
import { formatStackPath, getPickStack, nextDrillIndex, pickFromStack } from './elementPicker'
import { getOrCreatePickData } from './elementContext'

type EditorMode = 'idle' | PickToolId | 'ai'

interface HistoryEntry {
  html: string
}

function parseTranslate(el: HTMLElement): { x: number; y: number } {
  const t = el.style.transform
  if (!t || t === 'none') return { x: 0, y: 0 }
  const m = t.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/)
  if (m) return { x: parseFloat(m[1]), y: parseFloat(m[2]) }
  const m2 = t.match(/translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px/)
  if (m2) return { x: parseFloat(m2[1]), y: parseFloat(m2[2]) }
  return { x: 0, y: 0 }
}

export class PageEditor {
  private toolbar: FloatingToolbar
  private overlay: SelectionOverlay
  private propsPanel: PropertyPanel
  private aiPanel: AIChatPanel
  private aiWorkOverlay: AIWorkOverlay
  private active = false
  private selectedEl: HTMLElement | null = null
  private mode: EditorMode = 'idle'
  private history: HistoryEntry[] = []
  private historyIndex = -1
  private dragging = false
  private dragStart = { x: 0, y: 0, tx: 0, ty: 0 }
  private resizing = false
  private resizeDir = ''
  private resizeStart = { x: 0, y: 0, w: 0, h: 0, tx: 0, ty: 0 }
  private resizeObserver: ResizeObserver | null = null
  private updateRaf = 0
  private justDragged = false
  private aiRevertStack: string[] = []
  private aiPickActive = false
  private fileLinked = false
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private autoSavePending = false
  private pickDrill = { x: 0, y: 0, stack: [] as HTMLElement[], index: 0, time: 0 }
  private hoverDrillIndex = 0
  private lastPointer = { x: 0, y: 0 }

  private boundMouseMove = this.onMouseMove.bind(this)
  private boundMouseUp = this.onMouseUp.bind(this)
  private boundClick = this.onClick.bind(this)
  private boundDblClick = this.onDblClick.bind(this)
  private boundKeyDown = this.onKeyDown.bind(this)
  private boundScroll = () => this.scheduleUpdateOverlay()
  private boundResize = () => this.scheduleUpdateOverlay()

  constructor() {
    this.toolbar = new FloatingToolbar({ onTool: (tool, activeTool) => this.handleTool(tool, activeTool) })
    this.overlay = new SelectionOverlay()
    this.propsPanel = new PropertyPanel(() => {
      this.pushHistory()
      this.scheduleUpdateOverlay()
    })
    this.aiPanel = new AIChatPanel({
      onApplyHtml: (html, pickId) => this.applyAIHtml(html, pickId),
      onRevertAI: () => this.revertLastAIChange(),
      canRevertAI: () => this.aiRevertStack.length > 0,
      onAIWorkStart: (scope) => this.startAIWork(scope),
      onAIWorkEnd: () => this.endAIWork(),
      onClose: () => {
        this.toolbar.clearActiveTools()
        this.enterIdleMode()
      },
      onPickModeChange: (active) => {
        this.aiPickActive = active
        if (active) {
          this.deselect()
          this.overlay.hideHover()
        }
      },
      getSelectedHtml: () => this.selectedEl?.outerHTML,
      getSelectedPickForAI: () =>
        this.selectedEl ? getOrCreatePickData(this.selectedEl) : null,
    })
    this.aiWorkOverlay = new AIWorkOverlay()
    this.overlay.setResizeHandler((dir, e) => {
      if (!this.selectedEl) return
      this.resizing = true
      this.resizeDir = dir
      const rect = this.selectedEl.getBoundingClientRect()
      const { x, y } = parseTranslate(this.selectedEl)
      this.resizeStart = {
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
        tx: x,
        ty: y,
      }
    })
    this.overlay.setMoveHandler((e) => this.startDrag(e))
  }

  private startDrag(e: MouseEvent): void {
    if (!this.selectedEl || this.mode !== 'select') return
    e.preventDefault()
    e.stopPropagation()
    this.dragging = true
    const { x, y } = parseTranslate(this.selectedEl)
    this.dragStart = { x: e.clientX, y: e.clientY, tx: x, ty: y }
  }

  async toggle(): Promise<void> {
    if (this.active) {
      await this.deactivate()
      return
    }

    if (isOnlinePage() && !isLocalPage()) {
      localizeCurrentPage()
      return
    }

    await this.activate()
  }

  private async activate(): Promise<void> {
    if (this.active) return
    this.active = true
    this.pushHistory()
    this.toolbar.mount()
    document.addEventListener('mousemove', this.boundMouseMove, true)
    document.addEventListener('mouseup', this.boundMouseUp, true)
    document.addEventListener('click', this.boundClick, true)
    document.addEventListener('dblclick', this.boundDblClick, true)
    document.addEventListener('keydown', this.boundKeyDown, true)
    window.addEventListener('scroll', this.boundScroll, true)
    window.addEventListener('resize', this.boundResize, true)
    document.body.classList.add('htmlppt-editing')
    this.propsPanel.mount()
    this.aiWorkOverlay.mount()
    this.enterIdleMode()
    void this.setupAutoSave()
    this.toolbar.setStatus('请先选择工具，再点击页面元素', 'info')
  }

  private async setupAutoSave(): Promise<void> {
    if (!canAutoSaveHere()) return

    this.fileLinked = await isFileLinked()
    if (this.fileLinked) {
      this.toolbar.setStatus('自动保存已启用', 'success')
      return
    }

    this.toolbar.setStatus('请选择文件以启用自动保存（仅需一次）', 'info')
    this.fileLinked = await ensureFileLinked(true)
    if (this.fileLinked) {
      this.toolbar.setStatus('自动保存已启用', 'success')
    }
  }

  private async deactivate(): Promise<void> {
    if (!this.active) return
    await this.flushAutoSave()
    this.active = false
    this.enterIdleMode()
    this.overlay.hideAll()
    this.propsPanel.unbind()
    this.propsPanel.unmount()
    this.aiPanel.unmount()
    this.aiWorkOverlay.unmount()
    this.toolbar.unmount()
    document.removeEventListener('mousemove', this.boundMouseMove, true)
    document.removeEventListener('mouseup', this.boundMouseUp, true)
    document.removeEventListener('click', this.boundClick, true)
    document.removeEventListener('dblclick', this.boundDblClick, true)
    document.removeEventListener('keydown', this.boundKeyDown, true)
    window.removeEventListener('scroll', this.boundScroll, true)
    window.removeEventListener('resize', this.boundResize, true)
    document.body.classList.remove('htmlppt-editing')
    document.body.classList.remove(
      'htmlppt-mode-idle',
      'htmlppt-mode-select',
      'htmlppt-mode-text',
    )
  }

  private handleTool(tool: ToolId, activeTool: ToolId | null): void {
    switch (tool) {
      case 'select':
      case 'text':
        if (activeTool === tool) {
          this.enterPickMode(tool)
        } else {
          this.enterIdleMode()
        }
        break
      case 'image':
        this.replaceImage()
        break
      case 'delete':
        this.deleteSelected()
        break
      case 'ai':
        if (this.aiPanel.isVisible()) {
          this.aiPanel.hide()
          this.toolbar.clearActiveTools()
          this.enterIdleMode()
        } else {
          void this.aiPanel.show()
          this.toolbar.setActiveTool('ai')
          this.setMode('ai')
          this.overlay.hideHover()
        }
        break
      case 'undo':
        this.undo()
        break
      case 'redo':
        this.redo()
        break
      case 'save':
        void this.handleSave()
        break
      case 'close':
        void this.deactivate()
        break
    }
  }

  private enterPickMode(tool: PickToolId): void {
    this.setMode(tool)
    const hints: Record<PickToolId, string> = {
      select: '点击选中 · Tab 切换层级 · 同一位置再点可选父级',
      text: '点击文字编辑 · Tab 切换层级',
    }
    this.toolbar.setStatus(hints[tool], 'info')
    this.overlay.setMovable(tool === 'select')
    if (this.selectedEl) this.scheduleUpdateOverlay()
    if (tool === 'text' && this.selectedEl) {
      this.enableTextEdit(this.selectedEl)
    }
  }

  private enterIdleMode(): void {
    this.setMode('idle')
    this.deselect()
    this.overlay.hideHover()
  }

  private setMode(mode: EditorMode): void {
    this.mode = mode
    document.body.classList.remove(
      'htmlppt-mode-idle',
      'htmlppt-mode-select',
      'htmlppt-mode-text',
    )
    if (mode === 'idle' || mode === 'ai') {
      document.body.classList.add('htmlppt-mode-idle')
    } else {
      document.body.classList.add(`htmlppt-mode-${mode}`)
    }
  }

  private canPickElements(): boolean {
    return this.mode === 'select' || this.mode === 'text'
  }

  private startAIWork(scope: AIWorkScope): void {
    this.overlay.hideHover()
    this.overlay.hideSelected()
    this.aiWorkOverlay.show(scope)
  }

  private endAIWork(): void {
    this.aiWorkOverlay.hide()
  }

  private applyAIHtml(html: string, pickId?: string): boolean {
    this.aiRevertStack.push(document.body.innerHTML)
    this.deselect()

    if (pickId && this.replacePickedElement(pickId, html)) {
      this.pushHistory()
      this.toolbar.setStatus('AI 已更新元素', 'success')
      return true
    }

    if (this.shouldBlockFullBodyReplace(html)) {
      if (this.tryApplyFragmentPatch(html)) {
        this.pushHistory()
        this.toolbar.setStatus('AI 已更新元素', 'success')
        return true
      }
      this.aiRevertStack.pop()
      this.toolbar.setStatus('AI 返回不完整页面，已阻止覆盖', 'error')
      return false
    }

    document.body.innerHTML = html
    this.pushHistory()
    this.toolbar.setStatus('AI 已更新页面', 'success')
    return true
  }

  /** AI 只返回单个元素时，禁止替换整个 body */
  private shouldBlockFullBodyReplace(html: string): boolean {
    const trimmed = html.trim()
    const bodyHtml = document.body.innerHTML
    if (!trimmed || bodyHtml.length < 80) return false

    const fragment = this.parseBodyFragment(trimmed)
    if (!fragment) return trimmed.length < bodyHtml.length * 0.35

    const pageChildren = document.body.children.length
    if (fragment.childCount === 1 && pageChildren > 1) return true
    if (trimmed.length < bodyHtml.length * 0.3) return true
    return false
  }

  private parseBodyFragment(html: string): { childCount: number; root: HTMLElement | null } | null {
    try {
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
      return {
        childCount: doc.body.children.length,
        root: doc.body.firstElementChild as HTMLElement | null,
      }
    } catch {
      return null
    }
  }

  private tryApplyFragmentPatch(html: string): boolean {
    const trimmed = html.trim()
    const fragment = this.parseBodyFragment(trimmed)
    if (!fragment?.root || fragment.childCount !== 1) return false

    const newRoot = fragment.root
    const tag = newRoot.tagName.toLowerCase()

    if (newRoot.id) {
      const byId = document.getElementById(newRoot.id)
      if (byId) {
        byId.outerHTML = trimmed
        return true
      }
    }

    if (/^h[1-6]$/.test(tag)) {
      const matches = document.body.querySelectorAll(tag)
      if (matches.length === 1) {
        matches[0].outerHTML = trimmed
        return true
      }
    }

    const className = typeof newRoot.className === 'string' ? newRoot.className.trim() : ''
    if (className) {
      const firstClass = className.split(/\s+/).find((c) => c && !c.startsWith('htmlppt-'))
      if (firstClass) {
        const selector = `${tag}.${CSS.escape(firstClass)}`
        const matches = document.body.querySelectorAll(selector)
        if (matches.length === 1) {
          matches[0].outerHTML = trimmed
          return true
        }
      }
    }

    return false
  }

  private replacePickedElement(pickId: string, html: string): boolean {
    const el = document.querySelector(`[data-htmlppt-pick-id="${pickId}"]`) as HTMLElement | null
    if (!el?.parentElement) return false

    const parent = el.parentElement
    const index = Array.from(parent.children).indexOf(el)
    el.outerHTML = html.trim()

    const newEl = parent.children[index] as HTMLElement | undefined
    if (newEl) {
      newEl.setAttribute('data-htmlppt-pick-id', pickId)
    }
    return true
  }

  private revertLastAIChange(): boolean {
    const prev = this.aiRevertStack.pop()
    if (!prev) return false
    this.deselect()
    document.body.innerHTML = prev
    this.pushHistory()
    this.toolbar.setStatus('已撤销 AI 修改', 'info')
    return true
  }

  private async handleSave(): Promise<void> {
    this.toolbar.setStatus('保存中...', 'info')
    const result = await savePage({ interactive: true })
    if (result.ok) {
      this.fileLinked = true
    }
    this.toolbar.setStatus(result.message || '保存已取消', result.ok ? 'success' : 'error')
  }

  private onClick(e: MouseEvent): void {
    if (this.aiPickActive) return
    if (!this.active || this.dragging || this.justDragged) {
      this.justDragged = false
      return
    }
    if (!this.canPickElements()) return

    const target = e.target as HTMLElement
    if (this.isEditorUI(target)) return

    e.preventDefault()
    e.stopPropagation()

    const el = this.resolvePickTarget(e.clientX, e.clientY, true, e.altKey)
    if (!el) {
      this.deselect()
      return
    }

    this.overlay.hideHover()
    this.select(el)

    if (this.mode === 'text') {
      this.enableTextEdit(el)
    }
  }

  private onDblClick(e: MouseEvent): void {
    if (this.aiPickActive) return
    if (!this.active || !this.canPickElements()) return
    const target = e.target as HTMLElement
    if (this.isEditorUI(target)) return
    e.preventDefault()
    e.stopPropagation()
    const el = this.resolveHoverTarget(e.clientX, e.clientY)
    if (el) {
      this.enterPickMode('text')
      this.toolbar.setActiveTool('text')
      this.select(el)
      this.enableTextEdit(el)
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.aiPickActive) return
    if (!this.active) return

    if (this.resizing && this.selectedEl) {
      this.doResize(e)
      return
    }

    if (this.dragging && this.selectedEl) {
      const dx = e.clientX - this.dragStart.x
      const dy = e.clientY - this.dragStart.y
      const el = this.selectedEl
      el.style.transform = `translate(${this.dragStart.tx + dx}px, ${this.dragStart.ty + dy}px)`
      this.scheduleUpdateOverlay()
      return
    }

    const target = e.target as HTMLElement
    if (this.isEditorUI(target)) {
      this.overlay.hideHover()
      return
    }

    if (!this.canPickElements()) {
      this.overlay.hideHover()
      return
    }

    const el = this.resolveHoverTarget(e.clientX, e.clientY)
    if (el && el !== this.selectedEl) {
      const stack = this.getPickStackAt(e.clientX, e.clientY)
      const depth =
        stack.length > 1
          ? { index: this.hoverDrillIndex + 1, total: stack.length }
          : undefined
      this.overlay.showHover(el, depth)
    } else if (!el) {
      this.overlay.hideHover()
    }
  }

  private onMouseUp(): void {
    if (this.dragging || this.resizing) {
      this.pushHistory()
      if (this.dragging) this.justDragged = true
    }
    this.dragging = false
    this.resizing = false
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.active) return
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      this.undo()
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      this.redo()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      void this.handleSave()
    }
    if (e.key === 'Escape') {
      if (document.activeElement?.getAttribute('contenteditable')) {
        ;(document.activeElement as HTMLElement).blur()
      } else if (this.selectedEl) {
        this.deselect()
      } else if (this.mode !== 'idle') {
        if (this.aiPanel.isVisible()) this.aiPanel.hide()
        this.toolbar.clearActiveTools()
        this.enterIdleMode()
      } else {
        void this.deactivate()
      }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedEl) {
      if (document.activeElement?.getAttribute('contenteditable')) return
      if ((e.target as HTMLElement).closest('[data-htmlppt-editor="props"]')) return
      e.preventDefault()
      this.deleteSelected()
    }
    if (
      (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
      this.canPickElements() &&
      !this.aiPickActive
    ) {
      const inProps = (e.target as HTMLElement).closest('[data-htmlppt-editor="props"]')
      if (inProps && e.key === 'Tab') return
      e.preventDefault()
      const delta = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1
      this.cyclePickLevel(delta)
    }
  }

  private select(el: HTMLElement): void {
    if (this.selectedEl === el) {
      this.scheduleUpdateOverlay()
      return
    }
    this.deselect()
    this.selectedEl = el
    el.classList.add('htmlppt-editing-target')
    const { stack, index } = this.pickDrill
    this.propsPanel.bind(el)
    this.overlay.setMovable(this.mode === 'select')
    this.overlay.showSelected(el, stack.length > 1 ? { index: index + 1, total: stack.length } : undefined)
    el.addEventListener('mousedown', this.onElementMouseDown)
    this.resizeObserver = new ResizeObserver(() => this.scheduleUpdateOverlay())
    this.resizeObserver.observe(el)
  }

  private deselect(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    cancelAnimationFrame(this.updateRaf)

    if (this.selectedEl) {
      this.selectedEl.classList.remove('htmlppt-editing-target')
      this.selectedEl.removeEventListener('mousedown', this.onElementMouseDown)
      if (this.selectedEl.getAttribute('contenteditable')) {
        this.selectedEl.removeAttribute('contenteditable')
      }
    }
    this.selectedEl = null
    this.propsPanel.unbind()
    this.overlay.hideSelected()
  }

  private onElementMouseDown = (e: MouseEvent): void => {
    if (!this.selectedEl || this.mode !== 'select') return
    if ((e.target as HTMLElement).closest('.htmlppt-resize-handle')) return
    this.startDrag(e)
  }

  private scheduleUpdateOverlay(): void {
    cancelAnimationFrame(this.updateRaf)
    this.updateRaf = requestAnimationFrame(() => {
      if (this.selectedEl) this.overlay.updateSelected(this.selectedEl)
    })
  }

  private doResize(e: MouseEvent): void {
    if (!this.selectedEl) return
    const el = this.selectedEl
    const dx = e.clientX - this.resizeStart.x
    const dy = e.clientY - this.resizeStart.y
    const dir = this.resizeDir
    const MIN = 20

    let w = this.resizeStart.w
    let h = this.resizeStart.h
    let tx = this.resizeStart.tx
    let ty = this.resizeStart.ty

    // 东侧：固定左边，只改宽度
    if (dir.includes('e')) {
      w = Math.max(MIN, this.resizeStart.w + dx)
    }
    // 西侧：固定右边，改宽度的同时平移
    if (dir.includes('w')) {
      w = Math.max(MIN, this.resizeStart.w - dx)
      tx = this.resizeStart.tx + (this.resizeStart.w - w)
    }
    // 南侧：固定上边，只改高度
    if (dir.includes('s')) {
      h = Math.max(MIN, this.resizeStart.h + dy)
    }
    // 北侧：固定下边，改高度的同时平移
    if (dir.includes('n')) {
      h = Math.max(MIN, this.resizeStart.h - dy)
      ty = this.resizeStart.ty + (this.resizeStart.h - h)
    }

    el.style.width = `${w}px`
    el.style.height = `${h}px`
    el.style.boxSizing = 'border-box'
    el.style.transform = `translate(${tx}px, ${ty}px)`
    this.scheduleUpdateOverlay()
  }

  private enableTextEdit(el: HTMLElement): void {
    if (el.tagName === 'IMG') return
    el.setAttribute('contenteditable', 'true')
    el.focus()
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('contenteditable')
        this.pushHistory()
        this.scheduleUpdateOverlay()
      },
      { once: true },
    )
  }

  private replaceImage(): void {
    const el = this.selectedEl
    if (!el || el.tagName !== 'IMG') {
      this.toolbar.setStatus('请先点击「选择移动」选中一张图片', 'error')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        ;(el as HTMLImageElement).src = reader.result as string
        this.pushHistory()
        this.scheduleUpdateOverlay()
        this.toolbar.setStatus('图片已替换', 'success')
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  private deleteSelected(): void {
    if (!this.selectedEl) {
      this.toolbar.setStatus('请先点击「选择移动」选中要删除的元素', 'error')
      return
    }
    this.selectedEl.remove()
    this.deselect()
    this.pushHistory()
    this.toolbar.setStatus('已删除', 'success')
  }

  private pushHistory(): void {
    const html = document.body.innerHTML
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push({ html })
    if (this.history.length > 50) this.history.shift()
    this.historyIndex = this.history.length - 1
    this.scheduleAutoSave()
  }

  private scheduleAutoSave(): void {
    if (!this.fileLinked || !canAutoSaveHere()) return
    this.autoSavePending = true
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer)
    this.autoSaveTimer = setTimeout(() => void this.runAutoSave(), 1200)
  }

  private async runAutoSave(): Promise<void> {
    this.autoSaveTimer = null
    if (!this.autoSavePending || !this.fileLinked) return
    this.autoSavePending = false
    const result = await autoSavePage()
    if (result.ok) {
      this.toolbar.setStatus('已自动保存', 'success')
    } else if (!result.skipped) {
      this.fileLinked = false
      this.toolbar.setStatus('自动保存失败，请手动保存', 'error')
    }
  }

  private async flushAutoSave(): Promise<void> {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    if (!this.autoSavePending || !this.fileLinked) return
    this.autoSavePending = false
    await autoSavePage()
  }

  private undo(): void {
    if (this.historyIndex <= 0) return
    this.historyIndex--
    document.body.innerHTML = this.history[this.historyIndex].html
    this.deselect()
    this.toolbar.setStatus('已撤销', 'info')
  }

  private redo(): void {
    if (this.historyIndex >= this.history.length - 1) return
    this.historyIndex++
    document.body.innerHTML = this.history[this.historyIndex].html
    this.deselect()
    this.toolbar.setStatus('已重做', 'info')
  }

  private getPickStackAt(x: number, y: number): HTMLElement[] {
    if (!this.canPickElements()) return []
    return getPickStack(x, y, this.mode as 'select' | 'text')
  }

  private resolveHoverTarget(x: number, y: number): HTMLElement | null {
    const stack = this.getPickStackAt(x, y)
    if (stack.length === 0) return null
    if (Math.hypot(x - this.lastPointer.x, y - this.lastPointer.y) > 8) {
      this.hoverDrillIndex = 0
    }
    this.lastPointer = { x, y }
    return pickFromStack(stack, this.hoverDrillIndex)
  }

  private cyclePickLevel(delta: number): void {
    const x = this.lastPointer.x
    const y = this.lastPointer.y
    const stack = this.getPickStackAt(x, y)
    if (stack.length <= 1) return

    let newIndex = (this.pickDrill.stack === stack && this.pickDrill.stack.length > 0
      ? this.pickDrill.index
      : this.hoverDrillIndex) + delta

    if (newIndex < 0) newIndex = stack.length - 1
    if (newIndex >= stack.length) newIndex = 0

    this.hoverDrillIndex = newIndex
    this.pickDrill = { x, y, stack, index: newIndex, time: Date.now() }

    const el = pickFromStack(stack, newIndex)
    if (!el) return

    const path = formatStackPath(stack, newIndex)
    this.toolbar.setStatus(`层级 ${newIndex + 1}/${stack.length}: ${path}`, 'info')

    if (this.selectedEl) {
      this.select(el)
      if (this.mode === 'text') this.enableTextEdit(el)
    } else {
      this.overlay.showHover(el, { index: newIndex + 1, total: stack.length })
    }
  }

  private resolvePickTarget(x: number, y: number, advance: boolean, pickParent = false): HTMLElement | null {
    const stack = this.getPickStackAt(x, y)
    if (stack.length === 0) return null

    let index = 0
    if (pickParent) {
      index = Math.min(1, stack.length - 1)
    } else if (advance) {
      index = nextDrillIndex(stack, this.pickDrill, x, y, this.selectedEl)
    }

    this.pickDrill = { x, y, stack, index, time: Date.now() }
    this.hoverDrillIndex = index
    this.lastPointer = { x, y }

    const el = pickFromStack(stack, index)
    if (el && advance && stack.length > 1 && index > 0) {
      this.toolbar.setStatus(`已选中父级 ${index + 1}/${stack.length}，继续点击可切换层级`, 'info')
    }
    return el
  }

  private isEditorUI(el: HTMLElement): boolean {
    return !!el.closest('[data-htmlppt-editor]')
  }
}
