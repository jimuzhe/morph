const HTMLOPT_MARKER = 'data-htmlppt-editor'

export function serializeDocument(): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement
  cleanupEditorArtifacts(clone)
  return '<!DOCTYPE html>\n' + clone.outerHTML
}

function cleanupEditorArtifacts(root: HTMLElement): void {
  root.querySelectorAll(`[${HTMLOPT_MARKER}]`).forEach((el) => el.remove())
  root.querySelectorAll('[contenteditable]').forEach((el) => {
    el.removeAttribute('contenteditable')
  })
  root.querySelectorAll('.htmlppt-editing-target').forEach((el) => {
    el.classList.remove('htmlppt-editing-target')
  })
}

export function getSuggestedFilename(): string {
  const fromTitle = document.title?.trim().replace(/[^\w\u4e00-\u9fff-]/g, '_')
  if (fromTitle) return `${fromTitle}.html`
  if (location.protocol === 'file:') {
    const parts = location.pathname.split('/')
    const name = parts[parts.length - 1]
    if (name.endsWith('.html') || name.endsWith('.htm')) return name
  }
  return 'page.html'
}

export function isLocalPage(): boolean {
  return (
    location.protocol === 'file:' ||
    location.protocol === 'blob:' ||
    sessionStorage.getItem('htmlppt-localized') === '1'
  )
}

export function isOnlinePage(): boolean {
  return location.protocol === 'http:' || location.protocol === 'https:'
}

export function getBodyHtmlForAI(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  cleanupEditorArtifacts(clone)
  return clone.innerHTML
}

export function localizeCurrentPage(): void {
  const html = serializeDocument()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)

  sessionStorage.setItem('htmlppt-localized', '1')
  sessionStorage.setItem('htmlppt-auto-edit', '1')
  sessionStorage.setItem('htmlppt-original-url', location.href)
  sessionStorage.setItem('htmlppt-filename', getSuggestedFilename())
  sessionStorage.setItem('htmlppt-save-key', crypto.randomUUID())

  location.href = blobUrl
}
