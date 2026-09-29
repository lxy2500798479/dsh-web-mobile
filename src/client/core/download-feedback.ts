/**
 * Download feedback: the settled-delivery toast and its message mapping.
 *
 * Why (2026-09-29 customer report「点了 下载成功了 也没有提示」): both handoffs
 * are silent by construction — the share sheet closes onto wherever the user
 * saved to, and the streamed download runs in the browser's own UI — so the
 * customer cannot tell whether the tap worked. Failures keep their labels on
 * the control itself; only settled successes toast here.
 */
import { fileNameFromPath, type FileDeliveryOutcome } from './file-download.ts'

/** Which confirmation one settled outcome earns; cancelled/failed stay silent. */
export function downloadToastFor(
  outcome: FileDeliveryOutcome,
  path: string,
): { readonly key: 'downloadStarted' | 'downloadShared'; readonly name: string } | null {
  if (outcome.kind === 'shared') return { key: 'downloadShared', name: fileNameFromPath(path) }
  if (outcome.kind === 'saved') return { key: 'downloadStarted', name: fileNameFromPath(path) }
  return null
}

/** Visible time of one toast; a second message re-arms the same timer. */
const TOAST_VISIBLE_MS = 2600

let toastTimer: number | undefined

/**
 * Show (or refresh) the single success toast. One reusable node shared by both
 * download surfaces, so two quick taps cannot stack layers.
 * @param message - localized, already interpolated with the file name.
 */
export function showToast(message: string): void {
  if (typeof document === 'undefined' || message === '') return
  let node = document.querySelector<HTMLElement>('[data-mobile-nav="toast"]')
  if (node === null) {
    node = document.createElement('div')
    node.dataset.mobileNav = 'toast'
    node.setAttribute('role', 'status')
    node.setAttribute('aria-live', 'polite')
    document.body.appendChild(node)
  }
  node.textContent = message
  node.dataset.visible = 'true'
  // 终态内联（过渡照常动画，但终值不依赖样式表/帧调度——headless 后台页的
  // transition 会冻住，真机也不该被环境差异左右）。
  node.style.opacity = '1'
  node.style.visibility = 'visible'
  if (toastTimer !== undefined) window.clearTimeout(toastTimer)
  const shown = node
  toastTimer = window.setTimeout(() => {
    toastTimer = undefined
    delete shown.dataset.visible
    shown.style.opacity = '0'
    shown.style.visibility = 'hidden'
  }, TOAST_VISIBLE_MS)
}
