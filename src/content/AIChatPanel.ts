import {
  loadAIConfig,
  saveAIConfig,
  DEFAULT_AI_CONFIG,
  createModelId,
  getModelDisplayLabel,
  toRequestConfig,
  type AIConfig,
  type AIModelProfile,
} from '../shared/aiConfig'
import {
  chatCompletionStream,
  extractHtmlFromResponse,
  buildSystemPrompt,
  extractReplyText,
  type ChatMessage,
} from '../shared/aiClient'
import { getBodyHtmlForAI } from '../shared/htmlDocument'
import { formatPickForAI, type PickedElementData } from './elementContext'
import { AIPickTool } from './AIPickTool'
import type { AIWorkScope } from './AIWorkOverlay'
import { resolveTargetElement } from './aiTargetResolver'
import { getOrCreatePickData } from './elementContext'

export const AI_DOCK_CLASS = 'htmlppt-ai-dock-open'
const MIN_WIDTH = 320
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 400

const ICON_CHAT = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const ICON_UNDO = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 10h10a5 5 0 015 5v1"/><path d="M3 10l4-4"/><path d="M3 10l4 4"/></svg>`
const ICON_PICK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>`
const ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`
const ICON_SEND_SPINNER = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export interface AIChatCallbacks {
  onApplyHtml: (html: string, pickId?: string) => boolean
  onRevertAI: () => boolean
  canRevertAI: () => boolean
  onAIWorkStart?: (scope: AIWorkScope) => void
  onAIWorkEnd?: () => void
  onClose: () => void
  onPickModeChange?: (active: boolean) => void
  getSelectedHtml: () => string | undefined
  getSelectedPickForAI?: () => PickedElementData | null
}

interface UIMessage {
  role: 'user' | 'assistant'
  content: string
  applied?: boolean
}

const SUGGESTIONS = [
  '改标题样式与对齐',
  '添加按钮或新版块',
  '让页面更适合移动端',
  '把背景改成深色',
  '加一个联系我们的按钮',
]

export class AIChatPanel {
  private root: HTMLDivElement
  private shellEl: HTMLDivElement
  private resizer: HTMLDivElement
  private messagesEl: HTMLDivElement
  private inputEl: HTMLTextAreaElement
  private sendBtn: HTMLButtonElement
  private settingsPanel: HTMLDivElement
  private callbacks: AIChatCallbacks
  private history: ChatMessage[] = []
  private uiMessages: UIMessage[] = []
  private config: AIConfig = { ...DEFAULT_AI_CONFIG }
  private loading = false
  private visible = false
  private panelWidth = DEFAULT_WIDTH
  private revertBtn: HTMLButtonElement
  private pickBtn: HTMLButtonElement
  private pickCardsEl: HTMLDivElement
  private modelListEl!: HTMLDivElement
  private modelLabelEl: HTMLSpanElement
  private modelBadgeBtn: HTMLButtonElement
  private pickTool: AIPickTool
  private pickedElement: PickedElementData | null = null
  private lastAppliedMsgEl: HTMLDivElement | null = null
  private emptyEl: HTMLDivElement | null = null
  private imeComposing = false
  private streamCancel: (() => void) | null = null

  constructor(callbacks: AIChatCallbacks) {
    this.callbacks = callbacks
    this.root = document.createElement('div')
    this.root.setAttribute('data-htmlppt-editor', 'ai-panel')
    this.root.className = 'htmlppt-ai-panel'

    this.resizer = document.createElement('div')
    this.resizer.className = 'htmlppt-ai-resizer'
    this.resizer.title = '拖拽调整宽度'
    this.setupResizer()

    this.root.innerHTML = `
      <div class="htmlppt-ai-shell">
        <header class="htmlppt-ai-header">
          <div class="htmlppt-ai-brand">
            <span class="htmlppt-ai-brand-icon">${ICON_CHAT}</span>
            <span class="htmlppt-ai-brand-title">Morph</span>
          </div>
          <div class="htmlppt-ai-header-actions">
            <button class="htmlppt-ai-icon-btn" data-action="revert" title="撤销上次 AI 修改" disabled>${ICON_UNDO}</button>
            <button class="htmlppt-ai-icon-btn" data-action="settings" title="API 设置">${ICON_SETTINGS}</button>
            <button class="htmlppt-ai-icon-btn" data-action="close" title="关闭面板">${ICON_CLOSE}</button>
          </div>
        </header>
        <div class="htmlppt-ai-messages"></div>
        <footer class="htmlppt-ai-footer">
          <div class="htmlppt-ai-composer">
            <div class="htmlppt-ai-pick-cards"></div>
            <textarea class="htmlppt-ai-input" placeholder="输入你的想法…" rows="1"></textarea>
            <div class="htmlppt-ai-composer-bar">
              <div class="htmlppt-ai-composer-tools">
                <button class="htmlppt-ai-tool-btn htmlppt-ai-pick-btn" type="button" title="Pick 元素">
                  ${ICON_PICK}
                  <span>Pick</span>
                </button>
                <button class="htmlppt-ai-model-badge" type="button" title="模型配置">
                  <span class="htmlppt-ai-model-label">模型</span>
                </button>
              </div>
              <button class="htmlppt-ai-send" type="button" title="发送">
                <span class="htmlppt-ai-send-icon">${ICON_SEND}</span>
                <span class="htmlppt-ai-send-spinner" aria-hidden="true">${ICON_SEND_SPINNER}</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    `

    this.root.prepend(this.resizer)

    this.shellEl = this.root.querySelector('.htmlppt-ai-shell') as HTMLDivElement
    this.messagesEl = this.root.querySelector('.htmlppt-ai-messages')!
    this.inputEl = this.root.querySelector('.htmlppt-ai-input') as HTMLTextAreaElement
    this.sendBtn = this.root.querySelector('.htmlppt-ai-send') as HTMLButtonElement
    this.revertBtn = this.root.querySelector('[data-action="revert"]') as HTMLButtonElement
    this.pickBtn = this.root.querySelector('.htmlppt-ai-pick-btn') as HTMLButtonElement
    this.pickCardsEl = this.root.querySelector('.htmlppt-ai-pick-cards') as HTMLDivElement
    this.modelLabelEl = this.root.querySelector('.htmlppt-ai-model-label') as HTMLSpanElement
    this.modelBadgeBtn = this.root.querySelector('.htmlppt-ai-model-badge') as HTMLButtonElement

    this.pickTool = new AIPickTool(
      (data) => this.setPickedElement(data),
      (active) => this.onPickModeChange(active),
    )

    this.settingsPanel = this.createSettingsPanel()
    this.root.appendChild(this.settingsPanel)

    this.root.querySelector('[data-action="close"]')!.addEventListener('click', () => {
      this.hide()
      this.callbacks.onClose()
    })
    this.revertBtn.addEventListener('click', () => this.handleRevert())
    this.pickBtn.addEventListener('click', () => this.togglePick())
    this.modelBadgeBtn.addEventListener('click', () => this.openSettings())
    this.root.querySelector('[data-action="settings"]')!.addEventListener('click', () => {
      if (this.settingsPanel.classList.contains('open')) {
        this.closeSettings()
      } else {
        this.openSettings()
      }
    })

    this.sendBtn.addEventListener('click', () => void this.send())
    this.inputEl.addEventListener('compositionstart', () => {
      this.imeComposing = true
    })
    this.inputEl.addEventListener('compositionend', () => {
      // keydown 可能早于 compositionend，延迟一帧再解除
      setTimeout(() => {
        this.imeComposing = false
      }, 0)
    })
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      if (e.isComposing || this.imeComposing || e.keyCode === 229) return
      e.preventDefault()
      void this.send()
    })
    this.inputEl.addEventListener('input', () => {
      this.autoResizeInput()
      this.updateSendButton()
    })

    this.updateSendButton()
    void this.initConfig()
  }

  async show(): Promise<void> {
    if (this.visible) return

    // 清理可能因重复注入遗留的旧面板
    document.querySelectorAll('[data-htmlppt-editor="ai-panel"]').forEach((el) => {
      if (el !== this.root) el.remove()
    })

    if (!this.root.parentElement) {
      document.documentElement.appendChild(this.root)
    }
    this.applyDockLayout(true)
    this.visible = true
    requestAnimationFrame(() => this.root.classList.add('htmlppt-ai-visible'))
    this.inputEl.focus()
    if (this.uiMessages.length === 0 && !this.messagesEl.querySelector('.htmlppt-ai-empty')) {
      this.appendWelcome()
    }
  }

  hide(): void {
    if (this.loading) {
      this.callbacks.onAIWorkEnd?.()
    }
    this.streamCancel?.()
    this.streamCancel = null
    this.pickTool.stop()
    this.closeSettings()
    this.visible = false
    this.root.classList.remove('htmlppt-ai-visible')
    this.applyDockLayout(false)
  }

  isVisible(): boolean {
    return this.visible
  }

  unmount(): void {
    this.pickTool.destroy()
    this.hide()
    this.applyDockLayout(false)
    setTimeout(() => this.root.remove(), 280)
  }

  isPickActive(): boolean {
    return this.pickTool.isActive()
  }

  private togglePick(): void {
    const active = this.pickTool.toggle()
    this.pickBtn.classList.toggle('active', active)
    if (active) {
      this.closeSettings()
      this.appendSystemNote('点击页面元素选取，Tab 切换层级后点击确认')
    }
  }

  private onPickModeChange(active: boolean): void {
    this.pickBtn.classList.toggle('active', active)
    this.callbacks.onPickModeChange?.(active)
  }

  private setPickedElement(data: PickedElementData): void {
    this.pickedElement = data
    this.renderPickCard()
    this.updateSendButton()
    this.inputEl.focus()
    this.appendSystemNote(`已选取 ${data.label}`)
  }

  private clearPickedElement(): void {
    this.pickedElement = null
    this.pickCardsEl.innerHTML = ''
    this.pickCardsEl.hidden = true
    this.updateSendButton()
  }

  private renderPickCard(): void {
    this.pickCardsEl.innerHTML = ''
    if (!this.pickedElement) {
      this.pickCardsEl.hidden = true
      return
    }
    this.pickCardsEl.hidden = false
    this.pickCardsEl.appendChild(this.createPickCard(this.pickedElement, true))
  }

  private createPickCard(pick: PickedElementData, removable: boolean): HTMLDivElement {
    const card = document.createElement('div')
    card.className = 'htmlppt-ai-pick-card'
    card.dataset.pickId = pick.pickId

    const head = document.createElement('div')
    head.className = 'htmlppt-ai-pick-card-head'
    head.innerHTML = `
      <span class="htmlppt-ai-pick-card-icon">${ICON_PICK}</span>
      <span class="htmlppt-ai-pick-card-label">${pick.label}</span>
    `

    if (removable) {
      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'htmlppt-ai-pick-card-remove'
      removeBtn.title = '移除'
      removeBtn.innerHTML = ICON_CLOSE
      removeBtn.addEventListener('click', () => this.clearPickedElement())
      head.appendChild(removeBtn)
    }

    const preview = document.createElement('div')
    preview.className = 'htmlppt-ai-pick-card-preview'
    const code = pick.html.replace(/\s+/g, ' ').trim()
    preview.textContent = code.length > 120 ? `${code.slice(0, 120)}…` : code

    if (pick.styles) {
      const styles = document.createElement('div')
      styles.className = 'htmlppt-ai-pick-card-styles'
      styles.textContent = pick.styles.length > 100 ? `${pick.styles.slice(0, 100)}…` : pick.styles
      card.appendChild(head)
      card.appendChild(preview)
      card.appendChild(styles)
    } else {
      card.appendChild(head)
      card.appendChild(preview)
    }

    return card
  }

  private applyDockLayout(open: boolean): void {
    if (open) {
      document.documentElement.style.setProperty('--htmlppt-ai-width', `${this.panelWidth}px`)
      document.documentElement.classList.add(AI_DOCK_CLASS)
      this.root.style.width = `${this.panelWidth}px`
    } else {
      document.documentElement.classList.remove(AI_DOCK_CLASS)
    }
  }

  private setupResizer(): void {
    let startX = 0
    let startW = 0

    this.resizer.addEventListener('mousedown', (e) => {
      e.preventDefault()
      startX = e.clientX
      startW = this.panelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX
        this.panelWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + delta))
        document.documentElement.style.setProperty('--htmlppt-ai-width', `${this.panelWidth}px`)
        this.root.style.width = `${this.panelWidth}px`
      }
      const onUp = () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })
  }

  private autoResizeInput(): void {
    this.inputEl.style.height = 'auto'
    this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 120)}px`
  }

  private async initConfig(): Promise<void> {
    this.config = await loadAIConfig()
    this.updateModelBadge()
  }

  private openSettings(): void {
    this.renderModelList()
    this.settingsPanel.classList.add('open')
  }

  private closeSettings(): void {
    this.settingsPanel.classList.remove('open')
  }

  private renderModelList(): void {
    this.modelListEl.innerHTML = ''
    for (const profile of this.config.models) {
      this.modelListEl.appendChild(
        this.createModelItemElement(profile, profile.id === this.config.activeModelId),
      )
    }
    this.syncModelItemActiveStates()
  }

  private addModelToForm(profile: AIModelProfile): void {
    const isActive = this.modelListEl.querySelectorAll('.htmlppt-ai-model-item').length === 0
    this.modelListEl.appendChild(this.createModelItemElement(profile, isActive))
  }

  private createModelItemElement(profile: AIModelProfile, isActive: boolean): HTMLDivElement {
    const item = document.createElement('div')
    item.className = 'htmlppt-ai-model-item'
    if (isActive) item.classList.add('is-active')
    item.dataset.modelId = profile.id
    item.innerHTML = `
      <div class="htmlppt-ai-model-row">
        <label class="htmlppt-ai-model-active">
          <input type="radio" name="htmlppt-active-model" value="${escapeAttr(profile.id)}" ${isActive ? 'checked' : ''} />
          <span class="htmlppt-ai-model-active-dot" aria-hidden="true"></span>
        </label>
        <span class="htmlppt-ai-model-summary">${escapeAttr(profile.model || '未配置')}</span>
        <button type="button" class="htmlppt-ai-model-delete" title="删除">${ICON_CLOSE}</button>
      </div>
      <div class="htmlppt-ai-model-detail">
        <div class="htmlppt-ai-mini-field">
          <span class="htmlppt-ai-mini-label">Base URL</span>
          <input type="url" class="htmlppt-ai-settings-input htmlppt-ai-input-mono htmlppt-ai-input-compact" data-field="baseUrl" placeholder="https://api.example.com/v1" value="${escapeAttr(profile.baseUrl)}" />
        </div>
        <div class="htmlppt-ai-mini-field">
          <span class="htmlppt-ai-mini-label">API Key</span>
          <input type="password" class="htmlppt-ai-settings-input htmlppt-ai-input-mono htmlppt-ai-input-compact" data-field="apiKey" placeholder="sk-..." value="${escapeAttr(profile.apiKey)}" />
        </div>
        <div class="htmlppt-ai-mini-field">
          <span class="htmlppt-ai-mini-label">Model</span>
          <input type="text" class="htmlppt-ai-settings-input htmlppt-ai-input-mono htmlppt-ai-input-compact" data-field="model" placeholder="gpt-4o" value="${escapeAttr(profile.model)}" />
        </div>
      </div>
    `

    const radio = item.querySelector('input[type="radio"]') as HTMLInputElement
    const summary = item.querySelector('.htmlppt-ai-model-summary') as HTMLSpanElement
    const modelInput = item.querySelector('[data-field="model"]') as HTMLInputElement

    modelInput.addEventListener('input', () => {
      summary.textContent = modelInput.value.trim() || '未配置'
    })

    radio.addEventListener('change', () => this.syncModelItemActiveStates())

    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('.htmlppt-ai-model-delete')) return
      if (target.matches('input, textarea')) return
      radio.checked = true
      this.syncModelItemActiveStates()
    })

    item.querySelector('.htmlppt-ai-model-delete')!.addEventListener('click', (e) => {
      e.stopPropagation()
      if (this.modelListEl.querySelectorAll('.htmlppt-ai-model-item').length <= 1) {
        this.appendSystemNote('至少保留一条配置')
        return
      }
      const wasActive = radio.matches(':checked')
      item.remove()
      if (wasActive) {
        const firstRadio = this.modelListEl.querySelector(
          'input[name="htmlppt-active-model"]',
        ) as HTMLInputElement
        if (firstRadio) firstRadio.checked = true
      }
      this.syncModelItemActiveStates()
    })

    return item
  }

  private syncModelItemActiveStates(): void {
    for (const item of this.modelListEl.querySelectorAll('.htmlppt-ai-model-item')) {
      const el = item as HTMLDivElement
      const checked = el.querySelector('input[type="radio"]')?.matches(':checked')
      el.classList.toggle('is-active', checked)
    }
  }

  private readConfigFromForm(): AIConfig | null {
    const models: AIModelProfile[] = []

    for (const item of this.modelListEl.querySelectorAll('.htmlppt-ai-model-item')) {
      const el = item as HTMLDivElement
      const id = el.dataset.modelId
      if (!id) continue

      const baseUrl = (el.querySelector('[data-field="baseUrl"]') as HTMLInputElement).value.trim()
      const apiKey = (el.querySelector('[data-field="apiKey"]') as HTMLInputElement).value.trim()
      const model = (el.querySelector('[data-field="model"]') as HTMLInputElement).value.trim()

      if (!baseUrl || !apiKey || !model) return null
      models.push({ id, baseUrl, apiKey, model })
    }

    if (models.length === 0) return null

    const checked = this.modelListEl.querySelector(
      'input[name="htmlppt-active-model"]:checked',
    ) as HTMLInputElement | null
    let activeModelId = checked?.value
    if (!activeModelId || !models.some((m) => m.id === activeModelId)) {
      activeModelId = models[0].id
    }

    return { activeModelId, models }
  }

  private updateModelBadge(): void {
    this.modelLabelEl.textContent = getModelDisplayLabel(this.config)
  }

  private createSettingsPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.className = 'htmlppt-ai-settings'
    panel.innerHTML = `
      <div class="htmlppt-ai-settings-sheet">
        <header class="htmlppt-ai-settings-head">
          <h4>模型配置</h4>
          <button class="htmlppt-ai-settings-close" type="button" title="关闭">${ICON_CLOSE}</button>
        </header>
        <div class="htmlppt-ai-settings-body">
          <div class="htmlppt-ai-config-block">
            <div class="htmlppt-ai-config-label-row">
              <span class="htmlppt-ai-config-label">连接配置</span>
              <span class="htmlppt-ai-config-label-hint">Base URL · API Key · Model</span>
            </div>
            <div class="htmlppt-ai-model-list"></div>
            <div class="htmlppt-ai-config-toolbar">
              <button class="htmlppt-ai-config-link" type="button" data-action="add-model">+ 添加</button>
            </div>
          </div>
        </div>
        <footer class="htmlppt-ai-settings-foot">
          <button class="htmlppt-ai-settings-cancel" type="button">取消</button>
          <button class="htmlppt-ai-settings-save" type="button">保存</button>
        </footer>
      </div>
    `

    this.modelListEl = panel.querySelector('.htmlppt-ai-model-list') as HTMLDivElement

    panel.querySelector('.htmlppt-ai-settings-close')!.addEventListener('click', () => {
      this.closeSettings()
    })
    panel.querySelector('.htmlppt-ai-settings-cancel')!.addEventListener('click', () => {
      this.closeSettings()
    })
    panel.querySelector('.htmlppt-ai-settings-save')!.addEventListener('click', () => {
      void this.saveSettings()
    })
    panel.querySelector('[data-action="add-model"]')!.addEventListener('click', () => {
      this.addModelToForm({
        id: createModelId(),
        baseUrl: DEFAULT_AI_CONFIG.models[0]?.baseUrl || 'https://api.deepseek.com/v1',
        apiKey: '',
        model: '',
      })
      this.syncModelItemActiveStates()
    })

    return panel
  }

  private async saveSettings(): Promise<void> {
    const next = this.readConfigFromForm()
    if (!next) {
      this.appendSystemNote('请填写 Base URL、API Key 和 Model')
      return
    }

    this.config = next
    await saveAIConfig(this.config)
    this.closeSettings()
    this.updateModelBadge()
    this.appendSystemNote('配置已保存')
  }

  private appendWelcome(): void {
    if (this.emptyEl?.isConnected) return
    const existing = this.messagesEl.querySelector('.htmlppt-ai-empty')
    if (existing) {
      if (existing.querySelector('.htmlppt-ai-empty-prompt')) {
        this.emptyEl = existing as HTMLDivElement
        return
      }
      existing.remove()
    }

    const el = document.createElement('div')
    el.className = 'htmlppt-ai-empty'
    el.innerHTML = `
      <p class="htmlppt-ai-empty-prompt">说说你想怎么改</p>
      <div class="htmlppt-ai-empty-tags" aria-label="快捷示例"></div>
    `

    const tagsEl = el.querySelector('.htmlppt-ai-empty-tags') as HTMLDivElement
    for (const text of SUGGESTIONS) {
      const tag = document.createElement('button')
      tag.type = 'button'
      tag.className = 'htmlppt-ai-tag'
      tag.textContent = text
      tag.addEventListener('click', () => {
        this.inputEl.value = text
        this.updateSendButton()
        this.autoResizeInput()
        this.inputEl.focus()
      })
      tagsEl.appendChild(tag)
    }

    this.emptyEl = el
    this.messagesEl.appendChild(el)
  }

  private enterChatMode(): void {
    this.shellEl.classList.add('htmlppt-ai-has-chat')
    this.messagesEl.querySelectorAll('.htmlppt-ai-empty').forEach((node) => node.remove())
    this.emptyEl = null
  }

  private appendSystemNote(text: string): void {
    const el = document.createElement('div')
    el.className = 'htmlppt-ai-note'
    el.textContent = text
    this.messagesEl.appendChild(el)
    this.scrollToBottom()
  }

  private appendUserMessage(text: string, pick: PickedElementData | null): void {
    this.enterChatMode()
    this.uiMessages.push({ role: 'user', content: text })
    const el = document.createElement('div')
    el.className = 'htmlppt-ai-msg htmlppt-ai-msg-user'

    const body = document.createElement('div')
    body.className = 'htmlppt-ai-msg-body'

    if (pick) {
      body.appendChild(this.createPickCard(pick, false))
    }
    if (text) {
      const contentEl = document.createElement('div')
      contentEl.className = 'htmlppt-ai-msg-content'
      contentEl.textContent = text
      body.appendChild(contentEl)
    }

    el.appendChild(body)
    this.messagesEl.appendChild(el)
    this.scrollToBottom()
  }

  private appendMessage(role: 'user' | 'assistant', content: string, applied = false): HTMLDivElement {
    this.uiMessages.push({ role, content, applied })
    const el = document.createElement('div')
    el.className = `htmlppt-ai-msg htmlppt-ai-msg-${role}`

    const body = document.createElement('div')
    body.className = 'htmlppt-ai-msg-body'

    const contentEl = document.createElement('div')
    contentEl.className = 'htmlppt-ai-msg-content'
    contentEl.textContent = content
    body.appendChild(contentEl)

    if (applied) {
      if (this.lastAppliedMsgEl) {
        this.lastAppliedMsgEl.querySelector('.htmlppt-ai-applied-actions')?.remove()
      }

      const actions = document.createElement('div')
      actions.className = 'htmlppt-ai-applied-actions'

      const tag = document.createElement('span')
      tag.className = 'htmlppt-ai-applied-tag'
      tag.innerHTML = `${ICON_CHECK}<span>已应用到页面</span>`
      actions.appendChild(tag)

      const revertBtn = document.createElement('button')
      revertBtn.type = 'button'
      revertBtn.className = 'htmlppt-ai-revert-btn'
      revertBtn.textContent = '撤销'
      revertBtn.addEventListener('click', () => this.handleRevert(revertBtn, tag))
      actions.appendChild(revertBtn)

      body.appendChild(actions)
      this.lastAppliedMsgEl = el
    }

    el.appendChild(body)

    this.messagesEl.appendChild(el)
    this.scrollToBottom()
    this.updateRevertButton()
    return el
  }

  private handleRevert(inlineBtn?: HTMLButtonElement, inlineTag?: HTMLElement): void {
    if (!this.callbacks.canRevertAI()) return
    if (!this.callbacks.onRevertAI()) return

    if (inlineBtn) {
      inlineBtn.textContent = '已撤销'
      inlineBtn.disabled = true
    }
    if (inlineTag) {
      inlineTag.innerHTML = `<span>修改已撤销</span>`
      inlineTag.classList.add('htmlppt-ai-applied-reverted')
    }

    this.lastAppliedMsgEl?.querySelectorAll('.htmlppt-ai-revert-btn').forEach((btn) => {
      const b = btn as HTMLButtonElement
      if (!b.disabled) {
        b.textContent = '已撤销'
        b.disabled = true
      }
    })
    this.updateRevertButton()
    this.appendSystemNote('已恢复到 AI 修改前的页面')
  }

  private updateRevertButton(): void {
    this.revertBtn.disabled = !this.callbacks.canRevertAI()
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  private setLoading(on: boolean): void {
    this.loading = on
    this.inputEl.disabled = on
    this.pickBtn.disabled = on
    this.modelBadgeBtn.disabled = on
    this.sendBtn.classList.toggle('is-loading', on)
    if (on) this.closeSettings()
    this.updateSendButton()
  }

  private updateSendButton(): void {
    const hasContent = this.inputEl.value.trim().length > 0 || this.pickedElement !== null
    if (this.loading) {
      this.sendBtn.disabled = true
      return
    }
    this.sendBtn.disabled = !hasContent
  }

  private finalizeStreamMessage(
    contentEl: HTMLDivElement,
    full: string,
    applied: boolean,
    appliedToElement = false,
  ): void {
    const msgEl = contentEl.closest('.htmlppt-ai-msg') as HTMLDivElement
    msgEl?.classList.remove('htmlppt-ai-msg-streaming')

    const displayText = applied
      ? extractReplyText(full) || buildAppliedReplyFallback(appliedToElement)
      : full

    contentEl.textContent = displayText
    this.uiMessages.push({ role: 'assistant', content: full, applied })

    if (applied) {
      if (this.lastAppliedMsgEl) {
        this.lastAppliedMsgEl.querySelector('.htmlppt-ai-applied-actions')?.remove()
      }

      const body = contentEl.parentElement!
      const actions = document.createElement('div')
      actions.className = 'htmlppt-ai-applied-actions'

      const tag = document.createElement('span')
      tag.className = 'htmlppt-ai-applied-tag'
      tag.innerHTML = `${ICON_CHECK}<span>${appliedToElement ? '已应用到元素' : '已应用到页面'}</span>`
      actions.appendChild(tag)

      const revertBtn = document.createElement('button')
      revertBtn.type = 'button'
      revertBtn.className = 'htmlppt-ai-revert-btn'
      revertBtn.textContent = '撤销'
      revertBtn.addEventListener('click', () => this.handleRevert(revertBtn, tag))
      actions.appendChild(revertBtn)

      body.appendChild(actions)
      this.lastAppliedMsgEl = msgEl
      this.updateRevertButton()
    }

    this.scrollToBottom()
  }

  private appendAppliedAssistantMessage(reply: string, scoped: boolean): void {
    const el = document.createElement('div')
    el.className = 'htmlppt-ai-msg htmlppt-ai-msg-assistant'

    const body = document.createElement('div')
    body.className = 'htmlppt-ai-msg-body'

    const contentEl = document.createElement('div')
    contentEl.className = 'htmlppt-ai-msg-content'
    body.appendChild(contentEl)
    el.appendChild(body)
    this.messagesEl.appendChild(el)

    this.finalizeStreamMessage(contentEl, reply, true, scoped)
  }

  async send(): Promise<void> {
    const text = this.inputEl.value.trim()
    const pick = this.pickedElement
    if ((!text && !pick) || this.loading) return

    const requestConfig = toRequestConfig(this.config)
    if (!requestConfig.apiKey || !requestConfig.baseUrl || !requestConfig.model) {
      this.openSettings()
      this.appendSystemNote('请先配置 Base URL、API Key 和 Model')
      return
    }

    this.inputEl.value = ''
    this.autoResizeInput()
    this.clearPickedElement()
    this.setLoading(true)

    let pickSnapshot: PickedElementData | null = pick ? { ...pick } : null
    let wholePage = false

    if (!pickSnapshot) {
      pickSnapshot = this.callbacks.getSelectedPickForAI?.() ?? null
    }

    if (!pickSnapshot) {
      try {
        const resolved = await resolveTargetElement(text, requestConfig)
        wholePage = resolved.wholePage
        if (resolved.element) {
          pickSnapshot = getOrCreatePickData(resolved.element)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '识别失败'
        this.appendSystemNote(`无法识别修改区域：${msg}`)
        this.setLoading(false)
        return
      }
    }

    if (!pickSnapshot && !wholePage) {
      this.appendSystemNote('未能识别要修改的区域，请 Pick 目标元素或说明要改的部分（如「标题」「按钮」）')
      this.setLoading(false)
      return
    }

    const scoped = !!pickSnapshot
    const pickId = pickSnapshot?.pickId

    this.appendUserMessage(text, pickSnapshot)

    const workScope: AIWorkScope =
      wholePage && !pickSnapshot
        ? { type: 'page' }
        : { type: 'element', pickId: pickSnapshot!.pickId }
    this.callbacks.onAIWorkStart?.(workScope)

    let userContent: string
    if (scoped && pickSnapshot) {
      userContent = formatPickForAI(pickSnapshot, text)
    } else {
      const pageHtml = getBodyHtmlForAI()
      userContent = `${text}\n\n---\n页面上下文：\n当前页面标题：${document.title || '未命名'}\n当前 body HTML（${pageHtml.length} 字符）：\n\`\`\`html\n${truncate(pageHtml, 12000)}\n\`\`\``
    }

    if (this.history.length === 0) {
      this.history.push({ role: 'system', content: buildSystemPrompt(scoped) })
    } else if (this.history[0]?.role === 'system') {
      this.history[0].content = buildSystemPrompt(scoped)
    }
    this.history.push({ role: 'user', content: userContent })

    await new Promise<void>((resolve) => {
      this.streamCancel = chatCompletionStream(
        requestConfig,
        this.history,
        {
          onChunk: () => {
            /* 流式内容在左侧预览区展示，右侧不显示代码块 */
          },
          onDone: (reply) => {
            this.streamCancel = null
            this.callbacks.onAIWorkEnd?.()
            this.history.push({ role: 'assistant', content: reply })

            const newHtml = extractHtmlFromResponse(reply)
            if (newHtml) {
              const applied = this.callbacks.onApplyHtml(newHtml, pickId)
              if (applied) {
                this.appendAppliedAssistantMessage(reply, scoped)
              } else {
                this.appendMessage(
                  'assistant',
                  extractReplyText(reply) || '修改未能自动应用：返回内容不完整，请 Pick 目标元素后重试',
                )
                this.appendSystemNote(
                  'AI 只返回了局部 HTML，已阻止覆盖整页。请 Pick 或选中要改的元素后再发送',
                )
              }
            } else {
              this.appendMessage('assistant', reply)
            }
            resolve()
          },
          onError: (error) => {
            this.streamCancel = null
            this.callbacks.onAIWorkEnd?.()
            this.appendMessage('assistant', `出错了：${error}`)
            resolve()
          },
        },
      )
    })

    this.setLoading(false)
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '\n<!-- ... 已截断 ... -->'
}

function buildAppliedReplyFallback(appliedToElement: boolean): string {
  const elementReplies = [
    '已经按你的要求改好了，可以在左侧预览里看看效果。',
    '这个元素已更新，不满意的话可以用下面的撤销按钮恢复。',
    '改好啦，看看现在的样式是否符合你的想法。',
  ]
  const pageReplies = [
    '页面已按你的描述更新，左右对比一下效果吧。',
    '修改已经应用到页面上，有需要可以继续微调。',
    '改好了，预览区里可以直接看到最新效果。',
  ]
  const pool = appliedToElement ? elementReplies : pageReplies
  return pool[Math.floor(Math.random() * pool.length)]
}
