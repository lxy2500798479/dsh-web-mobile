/**
 * dsh-web-mobile, node half. Mostly a client UI plugin: apply() exists so the
 * plugin appears in the host Loader. It installs transparent gzip/brotli
 * compression for large JSON responses (long-session history is megabytes on
 * a phone; patches http.ServerResponse.prototype, disposer restores it), and
 * — ported from community-fork wzxmt-zhc v2.7.0 — the ONE host capability the
 * mobile drawer needs that the harness does not provide: deleting a session
 * (the host session menu only knows rename / fork / archive; archive only
 * hides a row).
 *
 * `POST /api/mobile-nav.session.delete` receives `{ sessionId }` and hands
 * the work to `deleteSession()` (see `delete-session.ts`). Services are read
 * at request time through `ctx.get()` so the row fails with a clear error
 * (never crashes) in host shapes that omit them.
 *
 * Since 2026-09-29 (customer line) it also mounts the streaming file
 * download route `GET|HEAD /api/mobile-nav.file.download?path=<absolute>`
 * through the authenticated `connection.fetch` fence — the harness ships no
 * download surface and `/api/file` cannot carry large files (whole-file
 * reads, 20 MiB image cap). See `file-download.ts` for the wire contract.
 *
 * The browser half ships via exports["./client"], discovered through the
 * package.json dsh.client declaration. Host packages are intentionally NOT
 * type-imported: this repo's node_modules only carries the client-side
 * @deepseek-ai packages, so all host faces are declared structurally below.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { installResponseCompression } from './compress.js'
import { deleteSession, type DeleteSessionDeps } from './delete-session.js'
import { FILE_DOWNLOAD_PATH, serveFileDownload, type DownloadFs } from './file-download.js'

/** Minimal structural slice of the host cordis Context that apply() needs. */
export interface HostContext {
  /** Register one disposable installer; its return value disposes on unload. */
  effect(install: () => unknown, label?: string): unknown
  /** Read one optional service by name (undefined when the host omits it). */
  get(service: string): unknown
  /** Run apply once the named services exist (cordis fiber inject). */
  inject(services: readonly string[], apply: (scoped: ScopedContext) => void): void
  /** Host logger service face (warn-level is all this plugin uses). */
  logger: { warn(message: string): void }
}

/** Route-registration face of the connection service's authenticated fetch fence. */
export interface ConnectionFetchRegistry {
  register(route: {
    path: string
    methods: readonly string[]
    requestBody: 'buffered'
    fetch: (request: Request) => Promise<Response> | Response
  }): unknown
}

/**
 * Context shape inside an inject scope. Both faces are declared on purpose:
 * the real host types differ across generations, so this plugin declares the
 * structural slices it registers routes on and guards each at the call site.
 */
export interface ScopedContext extends HostContext {
  webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    }): unknown
  }
  /** Present on Web host generations; optional here because the slice is hand-declared. */
  connection?: {
    fetch?: {
      register?: ConnectionFetchRegistry['register']
    }
  }
}

/** Wire contract of the session-delete endpoint. */
interface DeleteSessionBody {
  sessionId?: unknown
}

/** Maximum accepted request body size (1 MiB — the delete body is one id). */
const MAX_BODY_BYTES = 1_048_576

/** Sentinel: the request body grew past MAX_BODY_BYTES. */
class PayloadTooLargeError extends Error {}

/** Drain a request body as UTF-8 text, rejecting with PayloadTooLargeError
 * once the accumulated size exceeds MAX_BODY_BYTES. Past the limit the
 * buffered data is released and further chunks are discarded (the socket is
 * left to drain so the 413 response can actually be delivered — destroying
 * the request mid-stream would race the response and yield an empty reply). */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    let bytes = 0
    let tooLarge = false
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk)
      if (bytes > MAX_BODY_BYTES) {
        tooLarge = true
        data = ''
        return
      }
      if (!tooLarge) data += chunk
    })
    req.on('end', () => {
      if (tooLarge) reject(new PayloadTooLargeError())
      else resolve(data)
    })
    req.on('error', reject)
  })
}

/** Same-origin gate: a browser-supplied Origin header must name the same host
 * as the request itself. Missing/empty Origin = non-browser client = allowed.
 * No allowlist: localhost / 127.0.0.1 / LAN entries all work via host
 * equality, so same-origin browser POSTs (which always carry Origin) pass. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (origin === undefined || origin === '') return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/** Write one JSON response with a fixed content type. */
function respond(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/**
 * Plugin name, per the official minimal plugin shape (name + apply). The patch
 * row in cordis.patch.yml carries the same id, so nothing resolves through this
 * value in this repo; it labels the runtime record and is what the documented
 * form declares. Kept in sync with package.json name.
 */
export const name = 'dsh-web-mobile'

export function apply(ctx: HostContext): void {
  // Transparent gzip/brotli for large JSON responses (long-session history
  // is megabytes on a phone). Patches http.ServerResponse.prototype; the
  // disposer restores it on plugin unload/reload.
  ctx.effect(() => installResponseCompression(), 'dsh-web-mobile: response compression')

  // Session-delete route (port of fork wzxmt-zhc v2.7.0). Registers once the
  // web route registry exists; the persistence / session / agent / workspace
  // services are read per request so host shapes without them degrade to a
  // structured 503 instead of a crash.
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/api/mobile-nav.session.delete',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          respond(res, 405, { error: { code: 'method-not-allowed', message: 'POST required' } })
          return
        }
        if (!sameOrigin(req)) {
          respond(res, 403, { error: { code: 'cross-origin', message: 'cross-origin request rejected: Origin host does not match the request host' } })
          return
        }
        let body: DeleteSessionBody
        try {
          body = JSON.parse(await readBody(req)) as DeleteSessionBody
        } catch (error) {
          if (error instanceof PayloadTooLargeError) {
            respond(res, 413, { error: { code: 'payload-too-large', message: `request body exceeds the ${MAX_BODY_BYTES}-byte limit` } })
            return
          }
          respond(res, 400, {
            error: { code: 'invalid-body', message: 'expected a JSON body of the form { "sessionId": string }' },
          })
          return
        }
        const { sessionId } = body
        if (typeof sessionId !== 'string' || sessionId === '') {
          respond(res, 400, {
            error: { code: 'invalid-session-id', message: 'sessionId must be a non-empty string' },
          })
          return
        }

        const persistence = ctx.get('sessionPersistence')
        if (persistence === undefined) {
          respond(res, 503, {
            error: { code: 'persistence-unavailable', message: 'session persistence is not configured' },
          })
          return
        }
        const result = await deleteSession({
          persistence: persistence as DeleteSessionDeps['persistence'],
          sessions: ctx.get('sessions') as DeleteSessionDeps['sessions'] | undefined,
          agents: ctx.get('agents') as DeleteSessionDeps['agents'] | undefined,
          workspaceRegistry: ctx.get('workspaceRegistry') as DeleteSessionDeps['workspaceRegistry'] | undefined,
        }, sessionId)
        if (result.ok) {
          respond(res, 200, { ok: true, deleted: result.deleted })
          return
        }
        ctx.logger.warn(
          `dsh-web-mobile: session-delete failed for '${sessionId}' (${result.error.code}): ${result.error.message}`,
        )
        respond(res, result.status, { error: result.error })
      },
    }), 'dsh-web-mobile: session-delete route')
  })

  // File-download route (customer line, 2026-09-29): the harness has no
  // download surface and iOS standalone web apps ignore anchor downloads, so
  // the browser half hands small files to the Web Share sheet — which needs
  // the bytes inside the page. `/api/file` cannot carry them (whole-file
  // reads capped at the 20 MiB image limit); this route streams bounded
  // windows up to MAX_DOWNLOAD_BYTES through the authenticated /api fence.
  // The filesystem service is read per request, so host shapes without it
  // answer a structured 503 instead of crashing.
  ctx.inject(['connection'], (connCtx) => {
    const registry = connCtx.connection?.fetch
    if (registry?.register === undefined) {
      ctx.logger.warn('dsh-web-mobile: connection.fetch.register unavailable; file-download route not mounted')
      return
    }
    connCtx.effect(() => registry.register?.({
      path: FILE_DOWNLOAD_PATH,
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: (request: Request) => answerDownload(ctx, request),
    }), 'dsh-web-mobile: file-download route')
  })
}

/**
 * Answer one download request, resolving the composed filesystem lazily so a
 * host that omits it degrades to a structured 503.
 * @param ctx - host context the route captures (service lookup happens per request).
 * @param request - fenced /api request handed over by the connection service.
 * @returns the streaming download response.
 */
async function answerDownload(ctx: HostContext, request: Request): Promise<Response> {
  const fs = ctx.get('fs') as DownloadFs | undefined
  if (fs === undefined
    || typeof fs.resolve !== 'function'
    || typeof fs.stat !== 'function'
    || typeof fs.readByteRange !== 'function') {
    return new Response('filesystem unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
  return serveFileDownload(request, fs)
}
