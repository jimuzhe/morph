/** AI 修改进行时：在页面预览区显示遮罩与目标区域标识 */
export type AIWorkScope =
  | { type: 'element'; pickId: string }
  | { type: 'page' }

export class AIWorkOverlay {
  private root: HTMLDivElement
  private shade: HTMLDivElement
  private ring: HTMLDivElement
  private badge: HTMLDivElement
  private active = false
  private scope: AIWorkScope | null = null
  private rafId = 0

  constructor() {
    this.root = document.createElement('div')
    this.root.setAttribute('data-htmlppt-editor', 'ai-work')
    this.root.className = 'htmlppt-ai-work-overlay'
    this.root.hidden = true

    this.shade = document.createElement('div')
    this.shade.className = 'htmlppt-ai-work-shade'

    this.ring = document.createElement('div')
    this.ring.className = 'htmlppt-ai-work-ring'

    this.badge = document.createElement('div')
    this.badge.className = 'htmlppt-ai-work-badge'
    this.badge.innerHTML = `
      <span class="htmlppt-ai-work-badge-dot" aria-hidden="true"></span>
      <span class="htmlppt-ai-work-badge-text"></span>
    `

    this.root.appendChild(this.shade)
    this.root.appendChild(this.ring)
    this.root.appendChild(this.badge)
  }

  mount(): void {
    if (!this.root.parentElement) {
      document.documentElement.appendChild(this.root)
    }
  }

  unmount(): void {
    this.hide()
    this.root.remove()
  }

  show(scope: AIWorkScope): void {
    this.mount()
    this.active = true
    this.scope = scope
    this.root.hidden = false
    this.root.classList.toggle('htmlppt-ai-work-page', scope.type === 'page')
    this.root.classList.toggle('htmlppt-ai-work-element', scope.type === 'element')

    const textEl = this.badge.querySelector('.htmlppt-ai-work-badge-text') as HTMLSpanElement
    textEl.textContent =
      scope.type === 'element' ? 'Morph 正在修改此区域' : 'Morph 正在修改页面'

    if (scope.type === 'element') {
      this.shade.style.display = 'none'
      const el = document.querySelector(
        `[data-htmlppt-pick-id="${scope.pickId}"]`,
      ) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    } else {
      this.shade.style.display = 'block'
    }

    this.syncPosition()
    this.bindViewportSync()
  }

  hide(): void {
    this.active = false
    this.scope = null
    this.root.hidden = true
    this.unbindViewportSync()
  }

  private bindViewportSync(): void {
    this.unbindViewportSync()
    const onSync = () => this.scheduleSync()
    window.addEventListener('scroll', onSync, true)
    window.addEventListener('resize', onSync)
    ;(this.root as unknown as { _sync?: () => void })._sync = onSync
  }

  private unbindViewportSync(): void {
    const onSync = (this.root as unknown as { _sync?: () => void })._sync
    if (onSync) {
      window.removeEventListener('scroll', onSync, true)
      window.removeEventListener('resize', onSync)
      delete (this.root as unknown as { _sync?: () => void })._sync
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  private scheduleSync(): void {
    if (!this.active) return
    if (this.rafId) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0
      this.syncPosition()
    })
  }

  private syncPosition(): void {
    if (!this.active || !this.scope) return

    if (this.scope.type === 'page') {
      this.ring.style.display = 'none'
      this.badge.style.display = 'flex'
      const shadeRect = this.shade.getBoundingClientRect()
      this.badge.style.left = `${shadeRect.left + shadeRect.width / 2}px`
      this.badge.style.top = `${shadeRect.top + shadeRect.height / 2}px`
      this.badge.style.transform = 'translate(-50%, -50%)'
      return
    }

    const el = document.querySelector(
      `[data-htmlppt-pick-id="${this.scope.pickId}"]`,
    ) as HTMLElement | null

    if (!el) {
      this.ring.style.display = 'none'
      this.badge.style.display = 'flex'
      const shadeRect = this.shade.getBoundingClientRect()
      this.badge.style.left = `${shadeRect.left + shadeRect.width / 2}px`
      this.badge.style.top = `${shadeRect.top + shadeRect.height / 2}px`
      this.badge.style.transform = 'translate(-50%, -50%)'
      return
    }

    const rect = el.getBoundingClientRect()
    const pad = 4
    const left = rect.left - pad
    const top = rect.top - pad
    const width = rect.width + pad * 2
    const height = rect.height + pad * 2

    this.ring.style.display = 'block'
    Object.assign(this.ring.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    })

    this.badge.style.display = 'flex'
    const badgeTop = top + height + 10
    const badgeLeft = left + width / 2
    const clampedTop =
      badgeTop + 40 > window.innerHeight ? top - 36 : badgeTop
    this.badge.style.left = `${badgeLeft}px`
    this.badge.style.top = `${clampedTop}px`
    this.badge.style.transform = 'translate(-50%, 0)'
  }
}
