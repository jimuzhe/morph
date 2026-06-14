import './styles.css'
import { PageEditor } from './PageEditor'

const editor = new PageEditor()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HTMLOPT_TOGGLE') {
    void editor.toggle().then(() => sendResponse({ ok: true }))
    return true
  }
})

// 在线页面本地化后自动进入编辑模式
if (sessionStorage.getItem('htmlppt-auto-edit') === '1') {
  sessionStorage.removeItem('htmlppt-auto-edit')
  requestAnimationFrame(() => void editor.toggle())
}
