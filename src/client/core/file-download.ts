/**
 * File delivery core: authenticated byte fetch from the host file route, then
 * the device-side handoff. Every effect is injected, so the whole decision
 * path unit-tests with fakes and the component stays a thin adapter.
 *
 * Why share first (2026-09-29, customer report「文件没有下载的渠道」): the
 * customer entry is an iOS PWA installed to the home screen, and iOS
 * standalone web apps do not honour anchor downloads — the classic
 * blob + `a[download]` route silently does nothing there. The Web Share API
 * is the reliable iOS surface: the share sheet saves the file to Files or
 * forwards it to another app. Desktop and iOS-in-tab keep the anchor
 * download, which is also the fallback when a share is refused.
 *
 * The host route is `api/file?path=<absolute path>` (registered by
 * dsh-api-session-controller; GET/HEAD, cookie-authenticated, any file type).
 * Routes are addressed document-relative — the same convention as
 * `api/session.export` — so the URL keeps working behind the customer portal,
 * which serves the app at the site root. Files above the host byte cap answer
 * 413 instead of a body; unknown paths answer 404.
 */

/** Document-relative host route serving one file by absolute path. */
export const FILE_DOWNLOAD_ROUTE = 'api/file'

/** Build the download URL for one absolute host path. */
export function fileDownloadRoute(path: string): string {
  return FILE_DOWNLOAD_ROUTE + '?path=' + encodeURIComponent(path)
}

/** Basename of one host path, used as the browser-side file name. */
export function fileNameFromPath(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const base = cut >= 0 ? path.slice(cut + 1) : path
  return base === '' ? 'download' : base
}

/** Failure class a delivery can announce to the user. */
export type FileDeliveryFailure = 'too-large' | 'missing' | 'failed'

/** Settled outcome of one delivery attempt. */
export type FileDeliveryOutcome =
  | { readonly kind: 'shared' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly failure: FileDeliveryFailure }

/** Carrier for one fetched file body; `ok: false` carries the HTTP status. */
export type FileFetcher = (url: string) => Promise<{ ok: true; blob: Blob } | { ok: false; status: number }>

/** Device-side surface handoff; every part injected for tests. */
export interface FileDeliveryEnvironment {
  readonly fetchBytes: FileFetcher
  readonly canShare: (file: File) => boolean
  readonly share: (file: File) => Promise<void>
  readonly save: (blob: Blob, name: string) => void
}

/** A user-cancelled share surfaces as an AbortError; anything else is a refusal. */
function isCancellation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/**
 * Fetch one host file and hand it to the device: share sheet when the
 * environment supports it, anchor download otherwise.
 * @param path - absolute host path of the file, as the preview metadata reports it.
 * @param env - byte carrier and handoff surface.
 * @returns the settled outcome; failures name their class for the button's label.
 */
export async function deliverFile(path: string, env: FileDeliveryEnvironment): Promise<FileDeliveryOutcome> {
  const name = fileNameFromPath(path)
  let blob: Blob
  try {
    const response = await env.fetchBytes(fileDownloadRoute(path))
    if (!response.ok) {
      const failure: FileDeliveryFailure =
        response.status === 413 ? 'too-large' : response.status === 404 ? 'missing' : 'failed'
      return { kind: 'failed', failure }
    }
    blob = response.blob
  } catch {
    // Carrier rejection (offline, aborted fetch): the user retries from the same control.
    return { kind: 'failed', failure: 'failed' }
  }
  const file = new File([blob], name, { type: blob.type })
  if (env.canShare(file)) {
    try {
      await env.share(file)
      return { kind: 'shared' }
    } catch (error) {
      // A cancelled sheet is a user decision; any other refusal falls back to
      // the anchor route (desktop browsers, iOS in a normal tab).
      if (isCancellation(error)) return { kind: 'cancelled' }
    }
  }
  try {
    env.save(blob, name)
    return { kind: 'saved' }
  } catch {
    return { kind: 'failed', failure: 'failed' }
  }
}

/** Environment backed by the page: same-origin fetch, Web Share when present, anchor save. */
export function createBrowserEnvironment(): FileDeliveryEnvironment {
  const shareFn = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : undefined
  const canShareFn = typeof navigator.canShare === 'function' ? navigator.canShare.bind(navigator) : undefined
  return {
    fetchBytes: async (url) => {
      const response = await fetch(url, { credentials: 'same-origin' })
      return response.ok ? { ok: true, blob: await response.blob() } : { ok: false, status: response.status }
    },
    canShare: (file) => shareFn !== undefined && canShareFn !== undefined && canShareFn({ files: [file] }),
    // iOS shares a file only when `files` is the sole payload (mdn/content#32019):
    // extra title/text fields make the sheet silently drop the attachment.
    share: (file) => {
      if (shareFn === undefined) throw new Error('share unavailable')
      return shareFn({ files: [file] })
    },
    save: (blob, name) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.rel = 'noopener'
      anchor.click()
      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60_000)
    },
  }
}
