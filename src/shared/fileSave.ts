import { getSuggestedFilename, serializeDocument } from './htmlDocument'

const HANDLE_DB = 'htmlppt-handles'
const HANDLE_STORE = 'handles'
const DB_VERSION = 2

export interface SaveResult {
  ok: boolean
  message: string
  skipped?: boolean
}

export interface SaveOptions {
  /** 是否允许弹出文件选择器（手动保存 / 首次关联） */
  interactive?: boolean
}

/** 从 file:// URL 解析本地绝对路径 */
export function getFilePathFromUrl(): string | null {
  if (location.protocol !== 'file:') return null
  let path = decodeURIComponent(location.pathname)
  if (/^\/[A-Za-z]:\//.test(path)) {
    path = path.slice(1)
  }
  return path
}

export function getPageSaveKey(): string {
  if (location.protocol === 'file:') {
    return `file:${getFilePathFromUrl()}`
  }
  let key = sessionStorage.getItem('htmlppt-save-key')
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem('htmlppt-save-key', key)
  }
  return `session:${key}`
}

export function canAutoSaveHere(): boolean {
  return location.protocol === 'file:' || location.protocol === 'blob:'
}

/** 是否已关联可写文件（不弹窗） */
export async function isFileLinked(): Promise<boolean> {
  const handle = await getStoredHandle(getPageSaveKey())
  if (!handle) return false
  return canWrite(handle, false)
}

/**
 * 进入编辑时调用：恢复已有句柄，或弹出一次选择器完成关联。
 * 浏览器安全策略：必须用户亲手选一次文件，之后才能静默写入。
 */
export async function ensureFileLinked(interactive = true): Promise<boolean> {
  const pageKey = getPageSaveKey()
  const existing = await getStoredHandle(pageKey)
  if (existing && (await canWrite(existing, interactive))) {
    return true
  }

  if (!interactive) return false

  if (location.protocol === 'file:') {
    return linkLocalFileForSave()
  }
  if (location.protocol === 'blob:') {
    return linkBlobFileForSave()
  }
  return false
}

/** @deprecated 使用 ensureFileLinked */
export async function tryRestoreFileLink(): Promise<boolean> {
  return ensureFileLinked(true)
}

async function linkLocalFileForSave(): Promise<boolean> {
  if (!('showOpenFilePicker' in window)) return false

  const pageKey = getPageSaveKey()
  const suggestedName = getSuggestedFilename()

  try {
    const [handle] = await window.showOpenFilePicker!({
      types: [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }],
      multiple: false,
    })

    await storeHandle(pageKey, handle)
    if (handle.name !== suggestedName) {
      console.warn(`[HTMLPPT] 关联文件 ${handle.name}，当前页面 ${suggestedName}`)
    }
    return canWrite(handle, true)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return false
    throw err
  }
}

async function linkBlobFileForSave(): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false

  const pageKey = getPageSaveKey()
  const filename = sessionStorage.getItem('htmlppt-filename') || getSuggestedFilename()

  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: filename,
      types: [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }],
    })
    await storeHandle(pageKey, handle)
    sessionStorage.setItem('htmlppt-filename', handle.name)
    return canWrite(handle, true)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return false
    throw err
  }
}

export async function savePage(options: SaveOptions = {}): Promise<SaveResult> {
  const { interactive = true } = options
  const html = serializeDocument()
  const pageKey = getPageSaveKey()
  const filename = sessionStorage.getItem('htmlppt-filename') || getSuggestedFilename()

  const handle = await getStoredHandle(pageKey)
  if (handle) {
    try {
      await writeWithPermission(handle, html, interactive)
      return { ok: true, message: '已保存' }
    } catch {
      await clearStoredHandle(pageKey)
    }
  }

  if (!interactive) {
    return { ok: false, message: '', skipped: true }
  }

  if (location.protocol === 'file:') {
    const linked = await linkLocalFileForSave()
    if (linked) {
      const h = await getStoredHandle(pageKey)
      if (h) {
        await writeWithPermission(h, html, true)
        return { ok: true, message: '已保存（已启用自动保存）' }
      }
    }
    return { ok: false, message: '保存已取消' }
  }

  if (location.protocol === 'blob:') {
    const linked = await linkBlobFileForSave()
    if (linked) {
      const h = await getStoredHandle(pageKey)
      if (h) {
        await writeWithPermission(h, html, true)
        return { ok: true, message: '已保存（已启用自动保存）' }
      }
    }
    return { ok: false, message: '已取消保存' }
  }

  downloadHtml(html, filename)
  return { ok: true, message: `已下载 ${filename}` }
}

export async function autoSavePage(): Promise<SaveResult> {
  return savePage({ interactive: false })
}

async function canWrite(handle: FileSystemFileHandle, interactive: boolean): Promise<boolean> {
  const perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm === 'granted') return true
  if (!interactive) return false
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

async function writeWithPermission(
  handle: FileSystemFileHandle,
  html: string,
  interactive: boolean,
): Promise<void> {
  if (!(await canWrite(handle, interactive))) {
    throw new Error('permission denied')
  }
  await writeToHandle(handle, html)
}

async function writeToHandle(handle: FileSystemFileHandle, html: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(html)
  await writable.close()
}

function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getStoredHandle(pageKey: string): Promise<FileSystemFileHandle | null> {
  if (!('indexedDB' in window)) return null
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(HANDLE_STORE, 'readonly')
      const get = tx.objectStore(HANDLE_STORE).get(pageKey)
      get.onsuccess = () => resolve((get.result as FileSystemFileHandle) ?? null)
      get.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function storeHandle(pageKey: string, handle: FileSystemFileHandle): Promise<void> {
  if (!('indexedDB' in window)) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite')
    tx.objectStore(HANDLE_STORE).put(handle, pageKey)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function clearStoredHandle(pageKey: string): Promise<void> {
  if (!('indexedDB' in window)) return
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite')
      tx.objectStore(HANDLE_STORE).delete(pageKey)
      tx.oncomplete = () => resolve()
    })
  } catch {
    // ignore
  }
}
