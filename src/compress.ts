/**
 * Transparent response compression for large JSON payloads.
 *
 * Long sessions make `session.history` responses megabytes of JSON; on a
 * phone that is a slow, data-hungry transfer. This module patches
 * `http.ServerResponse.prototype` (process-wide, restored on dispose) so any
 * JSON response the host serves — the harness's own `/api/*` routes included —
 * is compressed when the client accepts it:
 *
 * - The client's `Accept-Encoding` picks the codec: `br` (brotli, quality 6)
 *   preferred, `gzip` fallback.
 * - Only JSON responses of at least MIN_JSON_BYTES are compressed; small
 *   JSON, static assets, ZIP and SSE streams pass through byte-identical with
 *   the original headers.
 * - `text/html` is deferred for the SHELL BRANDING rewrite instead
 *   (the shell-branding section below): the shell's vendor `<title>` is branded and the
 *   first-paint brand CSS is injected so the kernel boot page never shows
 *   vendor copy — not even for one frame. Any other HTML (and a shell whose
 *   markers are absent, e.g. after a host upgrade) passes through unchanged.
 * - The response header write is deferred until the body is known, so the
 *   decision (compress or not) is made on the actual size, and `Content-Length`
 *   always matches what is sent. Non-JSON responses call the original
 *   `writeHead` immediately and are never touched.
 *
 * The browser's fetch decompresses transparently, so no client change is
 * needed. SSE (`text/event-stream`) is intentionally left uncompressed: it is
 * a continuous stream and the /api bridge never buffers it.
 *
 * Known limitations (issue #80): while a response is deferred, write()
 * reports unconditional success (true) — the socket is untouched, so no
 * backpressure signal exists; buffered write() completion callbacks replay
 * fire-once, in order, right after the real end(), without error propagation
 * (the real flush cannot fail them individually).
 *
 * Ported from community fork wzxmt-zhc/dsh-web-mobile (v2.5.0).
 */
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib'
import { ServerResponse as NodeServerResponse } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ============================================================================
// Shell-HTML branding rewrite (see the module doc's text/html bullet).
// The host shell HTML carries the baked vendor `<title>`, and its kernel boot page
// paints BEFORE any client plugin loads — a client-side override always leaves a
// first-paint flash. Rewriting the HTML on the wire removes it, and covers
// pull-to-refresh too (same boot paint, replayed).
// ============================================================================

/** Vendor product title baked into the host shell HTML (`DSH_CLIENT_TITLE`). */
export const HOST_SHELL_TITLE = '<title>DeepSeek Harness</title>'

/** Branded replacement for that title. */
export const BRAND_SHELL_TITLE = '<title>拾贝智能体</title>'

/** Marker that identifies the host shell HTML (vs any other text/html body). */
export const SHELL_HTML_MARKER = HOST_SHELL_TITLE

/**
 * First-paint branding CSS. Selectors are scoped to the kernel boot page
 * (`[data-dsh-boot]`) and match the boot page's hashed class stems by
 * substring (`_wordmark_` / `_hint_`), per this repo's hashed-class rule.
 * `font-size: 0` hides the vendor text; `::after` supplies the brand copy.
 */
/**
 * Rule texts, verbatim-shared with the client fallback
 * (`deployment-mode.ts` → `CSS_RULES_BY_ITEM.bootWordmark`). The guard test
 * asserts both sides carry these exact strings — keep them in one shape.
 */
export const BOOT_BRAND_RULES: readonly string[] = [
  '[data-dsh-boot] [class*="_wordmark_"] { font-size: 0 !important; }',
  '[data-dsh-boot] [class*="_wordmark_"]::after { content: "拾贝智能体"; font-size: 16px; font-weight: 600; letter-spacing: .08em; }',
  '[data-dsh-boot] [class*="_hint_"] { font-size: 0 !important; }',
  '[data-dsh-boot] [class*="_hint_"]::after { content: "正在加载…"; font-size: 12px; }',
]

/** First-paint `<style>` tag injected into the shell HTML head. */
export const BOOT_BRAND_STYLE = '<style data-mobile-nav="boot-brand">' + BOOT_BRAND_RULES.join('') + '</style>'

/** Whether this text/html body is the host shell (carries the vendor title). */
export function isShellHtml(html: string): boolean {
  return html.includes(SHELL_HTML_MARKER)
}

/**
 * Rewrite the host shell HTML: brand the title and inject the first-paint CSS.
 * Returns the input unchanged (byte-identical) when it is not the host shell.
 * @param html - Raw shell HTML body.
 * @returns Patched HTML, or the original string when there is nothing to do.
 */
export function patchShellHtml(html: string): string {
  if (!isShellHtml(html)) return html
  let next = html.split(HOST_SHELL_TITLE).join(BRAND_SHELL_TITLE)
  // Inject before the first `</head>` so the rules are live from first paint.
  const headEnd = next.indexOf('</head>')
  if (headEnd !== -1) {
    next = next.slice(0, headEnd) + BOOT_BRAND_STYLE + next.slice(headEnd)
  }
  return next
}

/** Only payloads at least this large are worth compressing. */
const MIN_JSON_BYTES = 4 * 1024

/** Brotli quality: 6 balances size and CPU for large JSON (17MB → ~1MB). */
const BROTLI_QUALITY = 6

/** Fields shared by every deferred response (headers held until end()). */
interface DeferredCommon {
  /** Original writeHead argument list (status/message/headers) to replay. */
  writeHeadArgs: unknown[]
  /** Original headers object carried by writeHeadArgs. */
  headers: Record<string, string | number | string[]>
  /** Buffered body chunks. */
  chunks: Buffer[]
  /** write() completion callbacks buffered during deferral. */
  writeCallbacks: Array<() => void>
}

/**
 * One deferred response: headers held back until the body size is known.
 * Discriminated on `kind` so the JSON branch keeps a non-null codec while the
 * shell-HTML branch (never compressed) carries `null`.
 */
type DeferredResponse =
  | (DeferredCommon & { kind: 'json', encoding: 'br' | 'gzip' })
  | (DeferredCommon & { kind: 'html', encoding: null })

/** Per-response state; only present while a JSON response is being deferred. */
const deferred = new WeakMap<ServerResponse, DeferredResponse>()

/** Choose the codec the client accepts; `br` outranks `gzip`. */
function pickEncoding(res: ServerResponse): 'br' | 'gzip' | null {
  const accepted = (res.req as IncomingMessage | undefined)?.headers['accept-encoding'] ?? ''
  if (/\bbr\b/.test(accepted)) return 'br'
  if (/\bgzip\b/.test(accepted)) return 'gzip'
  return null
}

/**
 * Find a header value regardless of the caller's key casing. The patch sees
 * the RAW writeHead argument (before Node lowercases), and HTTP header names
 * are case-insensitive — a caller may pass `Content-Type` or `content-type`.
 * (Case-insensitivity fix ported from community fork wzxmt-zhc/dsh-web-mobile.)
 */
export function headerValue(headers: Record<string, string | number | string[]>, name: string): string | undefined {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) return String(headers[key])
  }
  return undefined
}

/** Whether a response warrants deferred (potentially compressed) handling. */
export function isDeferrable(headers: Record<string, string | number | string[]>): boolean {
  if (headerValue(headers, 'content-encoding') !== undefined) return false
  const contentType = headerValue(headers, 'content-type') ?? ''
  return contentType.includes('json')
}

/**
 * Whether a response carries the shell HTML (branding rewrite at end()).
 * Mirrors {@link isDeferrable} for `text/html`; the body marker decides
 * whether anything is actually rewritten, so non-shell HTML passes through
 * byte-identical.
 */
export function isShellDeferrable(headers: Record<string, string | number | string[]>): boolean {
  if (headerValue(headers, 'content-encoding') !== undefined) return false
  return (headerValue(headers, 'content-type') ?? '').includes('text/html')
}

/** Append the Accept-Encoding Vary token without clobbering an existing Vary. */
export function varyWithAcceptEncoding(headers: Record<string, string | number | string[]>): void {
  const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === 'vary')
  if (existingKey === undefined) {
    headers['vary'] = 'Accept-Encoding'
  } else {
    headers[existingKey] = `${String(headers[existingKey])}, Accept-Encoding`
  }
}

/** Buffer one body chunk for a deferred response, honoring the caller's encoding. */
function bufferChunk(pending: DeferredResponse, chunk: unknown, encoding?: unknown): void {
  const enc = typeof encoding === 'string' ? (encoding as BufferEncoding) : undefined
  if (typeof chunk === 'string') pending.chunks.push(Buffer.from(chunk, enc))
  else if (chunk instanceof Uint8Array) pending.chunks.push(Buffer.from(chunk))
  else if (chunk !== null && chunk !== undefined) pending.chunks.push(Buffer.from(String(chunk)))
}

/** Fire the buffered write() callbacks once, in order, after the replay. */
function fireWriteCallbacks(pending: DeferredResponse): void {
  for (const callback of pending.writeCallbacks.splice(0)) callback()
}

/** Replay the stored writeHead args with a replacement headers object. */
function writeHeadWith(res: ServerResponse, origWriteHead: (...args: unknown[]) => ServerResponse, pending: DeferredResponse, headers: Record<string, string | number | string[]>): ServerResponse {
  const args = pending.writeHeadArgs.slice() as unknown[]
  if (typeof args[1] === 'string') args[2] = headers
  else args[1] = headers
  // Keep the receiver: node's writeHead reads this._header etc.
  return origWriteHead.apply(res, args) as ServerResponse
}

/**
 * Install the compression patch on http.ServerResponse.prototype.
 * @returns disposer restoring the original methods (plugin reload safety).
 */
export function installResponseCompression(): () => void {
  const proto = NodeServerResponse.prototype
  // Capture the originals under the simple signatures the wrappers use; the
  // real overloaded implementations are restored unchanged on dispose.
  const origWriteHead = proto.writeHead as (...args: unknown[]) => ServerResponse
  const origWrite = proto.write as (chunk: unknown, ...rest: unknown[]) => boolean
  const origEnd = proto.end as (chunk?: unknown, ...rest: unknown[]) => ServerResponse

  function patchedWriteHead(this: ServerResponse, ...args: unknown[]): ServerResponse {
    const rawHeaders = typeof args[1] === 'string' ? args[2] : args[1]
    const headers = rawHeaders as Record<string, string | number | string[]> | undefined
    if (headers === undefined) {
      return origWriteHead.apply(this, args as never) as ServerResponse
    }
    // Shell HTML is rewritten (never compressed) and needs no Accept-Encoding.
    if (isShellDeferrable(headers)) {
      deferred.set(this, { kind: 'html', writeHeadArgs: args, headers, encoding: null, chunks: [], writeCallbacks: [] })
      return this
    }
    if (!isDeferrable(headers)) {
      return origWriteHead.apply(this, args as never) as ServerResponse
    }
    const encoding = pickEncoding(this)
    if (encoding === null) {
      return origWriteHead.apply(this, args as never) as ServerResponse
    }
    // Hold the header write until the body size is known (see module doc).
    deferred.set(this, { kind: 'json', writeHeadArgs: args, headers, encoding, chunks: [], writeCallbacks: [] })
    return this
  }

  function patchedWrite(this: ServerResponse, chunk: unknown, ...rest: unknown[]): boolean {
    const pending = deferred.get(this)
    if (pending !== undefined) {
      // Buffer the encoding with the chunk (a latin1 write must not be
      // silently re-encoded) and keep the completion callback for a
      // fire-once replay after the real end() (issue #80).
      bufferChunk(pending, chunk, typeof rest[0] === 'string' ? rest[0] : undefined)
      for (const arg of rest) {
        if (typeof arg === 'function') pending.writeCallbacks.push(arg as () => void)
      }
      return true
    }
    return origWrite.apply(this, [chunk, ...rest] as never) as boolean
  }

  function patchedEnd(this: ServerResponse, chunk?: unknown, ...rest: unknown[]): ServerResponse {
    const pending = deferred.get(this)
    if (pending === undefined) {
      return chunk === undefined
        ? origEnd.apply(this, rest as never) as ServerResponse
        : origEnd.apply(this, [chunk, ...rest] as never) as ServerResponse
    }
    deferred.delete(this)
    // `end(callback)`: the function is a completion callback, never body
    // data — keep it out of the buffers and replay it at the real end().
    const callbacks = (typeof chunk === 'function' ? [chunk, ...rest] : rest)
      .filter((arg) => typeof arg === 'function')
    // `end(data, encoding)` and friends: the data is buffered above and the
    // encoding is consumed by that buffering, so only the callbacks may be
    // replayed — origEnd('utf8') would write the string as body data after
    // the compressed payload (issue #78).
    if (chunk !== undefined && typeof chunk !== 'function') bufferChunk(pending, chunk, typeof rest[0] === 'string' ? rest[0] : undefined)
    const body = Buffer.concat(pending.chunks)

    // Shell HTML: rewrite the vendor title + inject the first-paint brand CSS
    // (see the shell-branding section). Non-shell HTML comes back byte-identical.
    if (pending.kind === 'html') {
      const original = body.toString('utf8')
      const patched = patchShellHtml(original)
      if (patched === original) {
        writeHeadWith(this, origWriteHead, pending, pending.headers)
        const ended = body.byteLength === 0
          ? origEnd.apply(this, callbacks as never) as ServerResponse
          : origEnd.apply(this, [body, ...callbacks] as never) as ServerResponse
        fireWriteCallbacks(pending)
        return ended
      }
      const out = Buffer.from(patched, 'utf8')
      const headers = { ...pending.headers }
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-length') delete headers[key]
      }
      headers['content-length'] = out.byteLength
      writeHeadWith(this, origWriteHead, pending, headers)
      const ended = origEnd.apply(this, [out, ...callbacks] as never) as ServerResponse
      fireWriteCallbacks(pending)
      return ended
    }

    // Small or empty JSON: replay the ORIGINAL header write and body verbatim
    // (no Content-Encoding, original Content-Length intact).
    if (body.byteLength < MIN_JSON_BYTES) {
      writeHeadWith(this, origWriteHead, pending, pending.headers)
      const ended = body.byteLength === 0
        ? origEnd.apply(this, callbacks as never) as ServerResponse
        : origEnd.apply(this, [body, ...callbacks] as never) as ServerResponse
      fireWriteCallbacks(pending)
      return ended
    }

    // Large JSON: compress and rewrite the length-bearing headers.
    const compressed = pending.encoding === 'br'
      ? brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } })
      : gzipSync(body, { level: 6 })
    const headers = { ...pending.headers }
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-length') delete headers[key]
    }
    headers['content-encoding'] = pending.encoding
    headers['content-length'] = compressed.byteLength
    varyWithAcceptEncoding(headers)
    writeHeadWith(this, origWriteHead, pending, headers)
    origWrite.call(this, compressed)
    const ended = origEnd.apply(this, callbacks as never) as ServerResponse
    fireWriteCallbacks(pending)
    return ended
  }

  proto.writeHead = patchedWriteHead
  proto.write = patchedWrite
  proto.end = patchedEnd

  return () => {
    if (proto.writeHead === patchedWriteHead) proto.writeHead = origWriteHead
    if (proto.write === patchedWrite) proto.write = origWrite
    if (proto.end === patchedEnd) proto.end = origEnd
  }
}
