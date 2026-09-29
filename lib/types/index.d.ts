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
import type { IncomingMessage, ServerResponse } from 'node:http';
/** Minimal structural slice of the host cordis Context that apply() needs. */
export interface HostContext {
    /** Register one disposable installer; its return value disposes on unload. */
    effect(install: () => unknown, label?: string): unknown;
    /** Read one optional service by name (undefined when the host omits it). */
    get(service: string): unknown;
    /** Run apply once the named services exist (cordis fiber inject). */
    inject(services: readonly string[], apply: (scoped: ScopedContext) => void): void;
    /** Host logger service face (warn-level is all this plugin uses). */
    logger: {
        warn(message: string): void;
    };
}
/** Route-registration face of the connection service's authenticated fetch fence. */
export interface ConnectionFetchRegistry {
    register(route: {
        path: string;
        methods: readonly string[];
        requestBody: 'buffered';
        fetch: (request: Request) => Promise<Response> | Response;
    }): unknown;
}
/**
 * Context shape inside an inject scope. Both faces are declared on purpose:
 * the real host types differ across generations, so this plugin declares the
 * structural slices it registers routes on and guards each at the call site.
 */
export interface ScopedContext extends HostContext {
    webServer: {
        register(route: {
            kind: 'exact';
            path: string;
            handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
        }): unknown;
    };
    /** Present on Web host generations; optional here because the slice is hand-declared. */
    connection?: {
        fetch?: {
            register?: ConnectionFetchRegistry['register'];
        };
    };
}
/**
 * Plugin name, per the official minimal plugin shape (name + apply). The patch
 * row in cordis.patch.yml carries the same id, so nothing resolves through this
 * value in this repo; it labels the runtime record and is what the documented
 * form declares. Kept in sync with package.json name.
 */
export declare const name = "dsh-web-mobile";
export declare function apply(ctx: HostContext): void;
//# sourceMappingURL=index.d.ts.map