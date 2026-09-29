/**
 * File delivery core: authenticated download of a container file, with the
 * device-side handoff split by what the platform can actually do.
 *
 * Why (2026-09-29, customer report「文件没有下载的渠道」/「文件大了就有问题」):
 * the host Web UI ships no download surface at all, and the customer entry is
 * an iOS PWA where standalone web apps silently ignore anchor/blob
 * downloads. The size story matters too — the first cut reused `/api/file`,
 * which buffers whole files and caps at 20 MiB (the image-attachment limit).
 * The route now lives in this plugin's host half (`src/file-download.ts`) and
 * streams up to 500 MiB in bounded windows, and this half matches that shape:
 *
 *   1. HEAD the route — one cheap probe decides the strategy and maps the
 *      route's 404/413 onto the user-facing labels before moving any bytes.
 *   2. Small files on iOS: fetch → Blob → Web Share sheet (the only reliable
 *      iOS handoff — save to Files / forward to WeChat). The share payload is
 *      `files` ONLY; iOS silently drops the attachment when other fields ride
 *      along (mdn/content#32019).
 *   3. Everything else: a plain anchor navigation to the route. The browser
 *      streams the response straight to disk (`Content-Disposition` names the
 *      file), so a 500 MiB download never enters JavaScript memory. Desktop
 *      always lands here; iOS above {@link SHARE_MAX_BYTES} too.
 */

/** Document-relative form of the host route (`src/file-download.ts` owns the absolute path). */
export const FILE_DOWNLOAD_ROUTE = 'api/mobile-nav.file.download'

/**
 * Above this size iOS goes through the streamed download instead of the share
 * sheet: the share path materializes the file in the page as a Blob, and
 * Safari's tab memory makes large blobs a crash risk.
 */
export const SHARE_MAX_BYTES = 128 * 1024 * 1024

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

/** Device-side surface handoff; every part injected for tests. */
export interface FileDeliveryEnvironment {
  /** HEAD probe: HTTP status, or the file size when the header is present. */
  headFile(url: string): Promise<{ ok: true; size: number | null } | { ok: false; status: number }>
  /** Whole-body read for the share path (bounded by the caller's size gate). */
  fetchBlob(url: string): Promise<{ ok: true; blob: Blob } | { ok: false; status: number }>
  /** Whether this device should use the share sheet at all. */
  canShareFiles(): boolean
  share(file: File): Promise<void>
  /** Hand the route URL to the browser as a download (streamed, no JS memory). */
  download(url: string): void
}

/** A user-cancelled share surfaces as an AbortError; anything else is a refusal. */
function isCancellation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/** Route status → user-facing failure class. */
function failureOf(status: number): FileDeliveryFailure {
  if (status === 413) return 'too-large'
  if (status === 404) return 'missing'
  return 'failed'
}

/**
 * Download one host file onto the device: probe, then share sheet (small iOS
 * files) or a browser-native streamed download.
 * @param path - absolute host path of the file, as the preview metadata reports it.
 * @param env - probe, byte carrier, and handoff surfaces.
 * @returns the settled outcome; failures name their class for the button's label.
 */
export async function deliverFile(path: string, env: FileDeliveryEnvironment): Promise<FileDeliveryOutcome> {
  const name = fileNameFromPath(path)
  const route = fileDownloadRoute(path)
  let size: number | null
  try {
    const head = await env.headFile(route)
    if (!head.ok) return { kind: 'failed', failure: failureOf(head.status) }
    size = head.size
  } catch {
    // Carrier rejection (offline, aborted probe): the user retries from the same control.
    return { kind: 'failed', failure: 'failed' }
  }
  if (env.canShareFiles() && (size === null || size <= SHARE_MAX_BYTES)) {
    let blob: Blob
    try {
      const got = await env.fetchBlob(route)
      if (!got.ok) return { kind: 'failed', failure: failureOf(got.status) }
      blob = got.blob
    } catch {
      return { kind: 'failed', failure: 'failed' }
    }
    const file = new File([blob], name, { type: blob.type })
    try {
      await env.share(file)
      return { kind: 'shared' }
    } catch (error) {
      // A cancelled sheet is a user decision; any other refusal falls through
      // to the streamed download as a recourse.
      if (isCancellation(error)) return { kind: 'cancelled' }
    }
  }
  try {
    env.download(route)
    return { kind: 'saved' }
  } catch {
    return { kind: 'failed', failure: 'failed' }
  }
}

/**
 * Whether this device is iOS/iPadOS — the only platform the share path exists
 * for. Android PWAs download anchor navigations fine, and a desktop OS share
 * dialog (desktop Chrome supports file sharing) would be a worse download UX
 * than the browser's own download manager.
 */
function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iP(hone|ad|od)/.test(navigator.userAgent)) return true
  // iPadOS 13+ reports a macOS user agent; touch points betray the tablet.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Environment backed by the page: same-origin fetch, Web Share on iOS, anchor download. */
export function createBrowserEnvironment(): FileDeliveryEnvironment {
  const shareFn = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : undefined
  const canShareFn = typeof navigator.canShare === 'function' ? navigator.canShare.bind(navigator) : undefined
  return {
    headFile: async (url) => {
      const response = await fetch(url, { method: 'HEAD', credentials: 'same-origin' })
      if (!response.ok) return { ok: false, status: response.status }
      const header = response.headers.get('content-length')
      const parsed = header === null ? Number.NaN : Number(header)
      return { ok: true, size: Number.isFinite(parsed) ? parsed : null }
    },
    fetchBlob: async (url) => {
      const response = await fetch(url, { credentials: 'same-origin' })
      return response.ok ? { ok: true, blob: await response.blob() } : { ok: false, status: response.status }
    },
    // Probe with a placeholder: canShare validates the payload shape, not this
    // file's bytes, so the decision lands before anything is fetched.
    canShareFiles: () => isIosLike()
      && shareFn !== undefined
      && canShareFn !== undefined
      && canShareFn({ files: [new File([], 'probe.txt', { type: 'text/plain' })] }),
    // iOS shares a file only when `files` is the sole payload.
    share: (file) => {
      if (shareFn === undefined) throw new Error('share unavailable')
      return shareFn({ files: [file] })
    },
    // Anchor navigation WITHOUT a download attribute: the route's
    // Content-Disposition names the file, and the browser streams the body to
    // disk instead of buffering it for script. Error responses carry a
    // disposition too, so a mid-flight failure saves an error file rather
    // than navigating the app away.
    download: (url) => {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.rel = 'noopener'
      anchor.click()
    },
  }
}
