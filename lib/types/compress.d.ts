/** Vendor product title baked into the host shell HTML (`DSH_CLIENT_TITLE`). */
export declare const HOST_SHELL_TITLE = "<title>DeepSeek Harness</title>";
/** Branded replacement for that title. */
export declare const BRAND_SHELL_TITLE = "<title>\u62FE\u8D1D\u667A\u80FD\u4F53</title>";
/** Marker that identifies the host shell HTML (vs any other text/html body). */
export declare const SHELL_HTML_MARKER = "<title>DeepSeek Harness</title>";
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
export declare const BOOT_BRAND_RULES: readonly string[];
/** First-paint `<style>` tag injected into the shell HTML head. */
export declare const BOOT_BRAND_STYLE: string;
/** Whether this text/html body is the host shell (carries the vendor title). */
export declare function isShellHtml(html: string): boolean;
/**
 * Rewrite the host shell HTML: brand the title and inject the first-paint CSS.
 * Returns the input unchanged (byte-identical) when it is not the host shell.
 * @param html - Raw shell HTML body.
 * @returns Patched HTML, or the original string when there is nothing to do.
 */
export declare function patchShellHtml(html: string): string;
/**
 * Find a header value regardless of the caller's key casing. The patch sees
 * the RAW writeHead argument (before Node lowercases), and HTTP header names
 * are case-insensitive — a caller may pass `Content-Type` or `content-type`.
 * (Case-insensitivity fix ported from community fork wzxmt-zhc/dsh-web-mobile.)
 */
export declare function headerValue(headers: Record<string, string | number | string[]>, name: string): string | undefined;
/** Whether a response warrants deferred (potentially compressed) handling. */
export declare function isDeferrable(headers: Record<string, string | number | string[]>): boolean;
/**
 * Whether a response carries the shell HTML (branding rewrite at end()).
 * Mirrors {@link isDeferrable} for `text/html`; the body marker decides
 * whether anything is actually rewritten, so non-shell HTML passes through
 * byte-identical.
 */
export declare function isShellDeferrable(headers: Record<string, string | number | string[]>): boolean;
/** Append the Accept-Encoding Vary token without clobbering an existing Vary. */
export declare function varyWithAcceptEncoding(headers: Record<string, string | number | string[]>): void;
/**
 * Install the compression patch on http.ServerResponse.prototype.
 * @returns disposer restoring the original methods (plugin reload safety).
 */
export declare function installResponseCompression(): () => void;
//# sourceMappingURL=compress.d.ts.map