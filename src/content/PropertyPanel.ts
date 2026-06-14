import { describeElement } from './elementContext'
import { ICON_GRIP } from './icons'
import {
  ICON_PROP_FILL,
  ICON_PROP_RADIUS,
  ICON_PROP_SIZE,
  ICON_PROP_SPACING,
  ICON_PROP_TEXT,
} from './propIcons'

type FieldDef =
  | { label: string; type: 'color' }
  | { label: string; type: 'text'; placeholder: string }
  | { label: string; type: 'select'; options: string[] }

type PropGroupId = 'text' | 'background' | 'radius' | 'spacing' | 'size'

const PROPS_POS_KEY = 'htmlppt-props-pos'

interface PropGroup {
  id: PropGroupId
  label: string
  icon: string
  fields: string[]
}

export class PropertyPanel {
  private root: HTMLDivElement
  private rail: HTMLDivElement
  private dragHandle: HTMLDivElement
  private sheet: HTMLDivElement
  private sheetTitle: HTMLSpanElement
  private sheetTarget: HTMLSpanElement
  private sheetBody: HTMLDivElement
  private groupBodies: Record<PropGroupId, HTMLDivElement> = {} as Record<PropGroupId, HTMLDivElement>
  private groupButtons: Record<PropGroupId, HTMLButtonElement> = {} as Record<PropGroupId, HTMLButtonElement>
  private onChange: () => void
  private target: HTMLElement | null = null
  private syncing = false
  private activeGroup: PropGroupId | null = null
  private historyTimer: ReturnType<typeof setTimeout> | null = null
  private fields: Record<string, HTMLInputElement | HTMLSelectElement> = {}
  private pos = { left: 12, top: 72 }

  private readonly groups: PropGroup[] = [
    { id: 'text', label: '文字', icon: ICON_PROP_TEXT, fields: ['color', 'fontSize', 'fontWeight', 'textAlign'] },
    { id: 'background', label: '背景', icon: ICON_PROP_FILL, fields: ['backgroundColor'] },
    { id: 'radius', label: '圆角', icon: ICON_PROP_RADIUS, fields: ['borderRadius'] },
    { id: 'spacing', label: '内边距', icon: ICON_PROP_SPACING, fields: ['padding'] },
    { id: 'size', label: '尺寸', icon: ICON_PROP_SIZE, fields: ['width', 'height'] },
  ]

  private fieldDefs: Record<string, FieldDef> = {
    color: { label: '颜色', type: 'color' },
    fontSize: { label: '字号', type: 'text', placeholder: '16px' },
    fontWeight: { label: '字重', type: 'select', options: ['', 'normal', '500', '600', 'bold'] },
    textAlign: { label: '对齐', type: 'select', options: ['', 'left', 'center', 'right'] },
    backgroundColor: { label: '背景色', type: 'color' },
    borderRadius: { label: '圆角', type: 'text', placeholder: '8px' },
    padding: { label: '内边距', type: 'text', placeholder: '12px' },
    width: { label: '宽度', type: 'text', placeholder: 'auto' },
    height: { label: '高度', type: 'text', placeholder: 'auto' },
  }

  constructor(onChange: () => void) {
    this.onChange = onChange
    this.root = document.createElement('div')
    this.root.setAttribute('data-htmlppt-editor', 'props')
    this.root.className = 'htmlppt-props-panel'
    this.root.hidden = true

    this.rail = document.createElement('div')
    this.rail.className = 'htmlppt-props-rail'

    this.dragHandle = document.createElement('div')
    this.dragHandle.className = 'htmlppt-props-drag-handle'
    this.dragHandle.title = '拖拽移动'
    this.dragHandle.setAttribute('aria-label', '拖拽移动属性面板')
    this.dragHandle.innerHTML = ICON_GRIP
    this.rail.appendChild(this.dragHandle)

    for (const group of this.groups) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'htmlppt-props-group-btn'
      btn.dataset.group = group.id
      btn.title = group.label
      btn.setAttribute('aria-label', group.label)
      btn.innerHTML = `<span class="htmlppt-props-group-icon">${group.icon}</span>`
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleGroup(group.id)
      })
      this.groupButtons[group.id] = btn
      this.rail.appendChild(btn)

      const body = document.createElement('div')
      body.className = 'htmlppt-props-group-fields'
      body.dataset.group = group.id
      body.innerHTML = group.fields.map((key) => this.buildFieldHtml(key)).join('')
      this.groupBodies[group.id] = body

      for (const key of group.fields) {
        const el = body.querySelector(`[data-prop="${key}"]`) as HTMLInputElement | HTMLSelectElement
        if (el) this.fields[key] = el
      }
    }

    this.sheet = document.createElement('div')
    this.sheet.className = 'htmlppt-props-sheet'
    this.sheet.hidden = true

    const sheetHead = document.createElement('div')
    sheetHead.className = 'htmlppt-props-sheet-head'
    this.sheetTitle = document.createElement('span')
    this.sheetTitle.className = 'htmlppt-props-sheet-title'
    this.sheetTarget = document.createElement('span')
    this.sheetTarget.className = 'htmlppt-props-sheet-target'
    sheetHead.appendChild(this.sheetTitle)
    sheetHead.appendChild(this.sheetTarget)

    this.sheetBody = document.createElement('div')
    this.sheetBody.className = 'htmlppt-props-sheet-body'

    this.sheet.appendChild(sheetHead)
    this.sheet.appendChild(this.sheetBody)

    this.root.appendChild(this.rail)
    this.root.appendChild(this.sheet)

    this.sheet.addEventListener('input', (e) => this.onFieldInput(e))
    this.sheet.addEventListener('change', (e) => this.onFieldInput(e))

    this.setupDrag()
  }

  private setupDrag(): void {
    this.dragHandle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      const rect = this.root.getBoundingClientRect()
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      this.root.classList.add('htmlppt-props-dragging')

      const onMove = (ev: PointerEvent) => {
        this.setPosition({
          left: ev.clientX - offsetX,
          top: ev.clientY - offsetY,
        })
      }

      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        this.root.classList.remove('htmlppt-props-dragging')
        this.savePosition()
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    })
  }

  private setPosition(pos: { left: number; top: number }): void {
    const margin = 8
    const w = this.root.offsetWidth || 200
    const h = this.root.offsetHeight || 120
    const left = Math.max(margin, Math.min(pos.left, window.innerWidth - w - margin))
    const top = Math.max(margin, Math.min(pos.top, window.innerHeight - h - margin))
    this.pos = { left, top }
    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
  }

  private loadPosition(): void {
    try {
      const raw = sessionStorage.getItem(PROPS_POS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { left?: number; top?: number }
      if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
        this.setPosition({ left: parsed.left, top: parsed.top })
      }
    } catch {
      /* ignore */
    }
  }

  private savePosition(): void {
    sessionStorage.setItem(PROPS_POS_KEY, JSON.stringify(this.pos))
  }

  private mounted = false

  mount(): void {
    if (this.mounted) return
    document.documentElement.appendChild(this.root)
    this.loadPosition()
    this.mounted = true
  }

  unmount(): void {
    this.unbind()
    if (!this.mounted) return
    this.root.remove()
    this.mounted = false
  }

  private buildFieldHtml(key: string): string {
    const def = this.fieldDefs[key]
    if (!def) return ''
    if (def.type === 'select') {
      const opts = def.options
        .map((v) => `<option value="${v}">${v || '默认'}</option>`)
        .join('')
      return `<label class="htmlppt-props-field"><span>${def.label}</span><select data-prop="${key}">${opts}</select></label>`
    }
    if (def.type === 'color') {
      return `<label class="htmlppt-props-field"><span>${def.label}</span><input type="color" data-prop="${key}" /></label>`
    }
    return `<label class="htmlppt-props-field"><span>${def.label}</span><input type="text" data-prop="${key}" placeholder="${def.placeholder}" /></label>`
  }

  private toggleGroup(id: PropGroupId): void {
    if (!this.target) return
    if (this.activeGroup === id) {
      this.closeGroup()
      return
    }
    this.openGroup(id)
  }

  private openGroup(id: PropGroupId): void {
    const group = this.groups.find((g) => g.id === id)
    if (!group) return

    this.activeGroup = id
    this.sheetTitle.textContent = group.label
    this.sheetTarget.textContent = describeElement(this.target!)
    this.sheetBody.replaceChildren(this.groupBodies[id])
    this.sheet.hidden = false
    this.root.classList.add('has-sheet')

    for (const g of this.groups) {
      this.groupButtons[g.id].classList.toggle('is-active', g.id === id)
    }
  }

  private closeGroup(): void {
    this.activeGroup = null
    this.sheet.hidden = true
    this.root.classList.remove('has-sheet')
    for (const g of this.groups) {
      this.groupButtons[g.id].classList.remove('is-active')
    }
  }

  bind(el: HTMLElement): void {
    if (!this.mounted) return
    this.target = el
    this.closeGroup()
    this.syncFromElement()
    this.root.hidden = false
  }

  unbind(): void {
    this.target = null
    this.closeGroup()
    if (this.mounted) this.root.hidden = true
  }

  destroy(): void {
    if (this.historyTimer) clearTimeout(this.historyTimer)
    this.unmount()
  }

  isVisible(): boolean {
    return this.mounted && !this.root.hidden
  }

  private syncFromElement(): void {
    if (!this.target) return
    this.syncing = true
    const el = this.target
    const cs = getComputedStyle(el)

    this.setFieldValue('color', rgbToHex(cs.color) || '#000000')
    this.setFieldValue('fontSize', el.style.fontSize || cs.fontSize)
    this.setFieldValue('fontWeight', el.style.fontWeight || normalizeWeight(cs.fontWeight))
    this.setFieldValue('textAlign', el.style.textAlign || cs.textAlign)
    this.setFieldValue('backgroundColor', rgbToHex(cs.backgroundColor) || '#ffffff')
    this.setFieldValue('borderRadius', el.style.borderRadius || cs.borderRadius)
    this.setFieldValue(
      'padding',
      el.style.padding || shorthand(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft),
    )
    this.setFieldValue('width', el.style.width || (cs.width !== 'auto' ? cs.width : ''))
    this.setFieldValue('height', el.style.height || (cs.height !== 'auto' ? cs.height : ''))

    this.syncing = false
  }

  private setFieldValue(key: string, value: string): void {
    const field = this.fields[key]
    if (!field) return
    if (field.type === 'color') {
      field.value = value.startsWith('#') ? value : '#000000'
    } else {
      field.value = value === 'normal' && key === 'fontWeight' ? '' : value
    }
  }

  private onFieldInput(e: Event): void {
    if (this.syncing || !this.target) return
    const input = e.target as HTMLInputElement | HTMLSelectElement
    const prop = input.dataset.prop
    if (!prop) return

    const styleMap: Record<string, string> = {
      color: 'color',
      fontSize: 'font-size',
      fontWeight: 'font-weight',
      textAlign: 'text-align',
      backgroundColor: 'background-color',
      borderRadius: 'border-radius',
      padding: 'padding',
      width: 'width',
      height: 'height',
    }

    const cssProp = styleMap[prop]
    if (!cssProp) return

    const value = input.value.trim()
    if (value) {
      this.target.style.setProperty(cssProp, value)
    } else {
      this.target.style.removeProperty(cssProp)
    }

    this.scheduleChange()
  }

  private scheduleChange(): void {
    if (this.historyTimer) clearTimeout(this.historyTimer)
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null
      this.onChange()
    }, 400)
  }
}

function rgbToHex(rgb: string): string | null {
  if (!rgb || rgb === 'transparent') return null
  if (rgb.startsWith('#')) return rgb
  const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (!m) return null
  const r = parseInt(m[1], 10)
  const g = parseInt(m[2], 10)
  const b = parseInt(m[3], 10)
  if (rgb.startsWith('rgba')) {
    const a = rgb.match(/,\s*([\d.]+)\s*\)/)?.[1]
    if (a && parseFloat(a) === 0) return null
  }
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function normalizeWeight(w: string): string {
  if (w === '400' || w === 'normal') return ''
  if (w === '700' || w === 'bold') return 'bold'
  return w
}

function shorthand(t: string, r: string, b: string, l: string): string {
  if (t === r && r === b && b === l) return t
  if (t === b && r === l) return `${t} ${r}`
  return `${t} ${r} ${b} ${l}`
}
