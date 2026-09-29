/**
 * Host-side streaming download: serve one absolute container path as a
 * download through the authenticated /api fence.
 *
 * Why (2026-09-29, customer report「文件没有下载的渠道」/「文件大了就有问题」):
 * the harness ships no download surface at all, and the one existing byte
 * route (`/api/file`) reads each file completely into memory and caps at the
 * image-attachment limit (`attachment-local.maxImageBytes`, 20 MiB by
 * default). Raising that value would raise image intake with it, and a single
 * large read would allocate the file size at least twice inside a pod whose
 * template limit is 4 GiB. This route stats first and streams bounded windows
 * through the composed filesystem, so a 500 MiB download costs chunk-size
 * memory instead of file-size memory.
 *
 * Wire contract (registered by the node half at {@link FILE_DOWNLOAD_PATH}):
 *   GET|HEAD ?path=<absolute path>
 *   200 — raw bytes; Content-Length/Type plus an attachment disposition
 *   400 — missing path / path not absolute
 *   403 — not a regular file / permission denied
 *   404 — missing
 *   413 — above {@link MAX_DOWNLOAD_BYTES}
 *   499 — client aborted · 503 — filesystem service unavailable
 */
/** Absolute registration path; the browser half addresses its document-relative form. */
export declare const FILE_DOWNLOAD_PATH = "/api/mobile-nav.file.download";
/**
 * Served-size ceiling (bytes). Streaming makes this a policy bound, not a
 * memory bound: the response holds at most one window however large the file.
 */
export declare const MAX_DOWNLOAD_BYTES: number;
/** Minimal structural slice of the composed filesystem (host packages are not type-imported). */
export interface DownloadFs {
    resolve(path: string, opts?: {
        signal?: AbortSignal;
    }): Promise<DownloadTarget>;
    stat(target: DownloadTarget, signal?: AbortSignal): Promise<DownloadInfo | undefined>;
    readByteRange(target: DownloadTarget, range: {
        offset: number;
        length: number;
    }, signal?: AbortSignal): Promise<Uint8Array>;
}
/** Opaque target handle; the route only passes it between filesystem calls. */
export interface DownloadTarget {
    readonly targetKey: unknown;
    readonly displayPath: string;
}
/** The slice of `stat` this route reads. */
export interface DownloadInfo {
    readonly type: 'file' | 'directory' | 'other';
    readonly size?: number;
}
/** Content type by file extension; unknown suffixes fall back to a binary type. */
export declare function contentTypeFor(path: string): string;
/**
 * RFC 6266 disposition: an ASCII fallback plus the UTF-8 form, so Chinese
 * file names survive however the client picks between them.
 * @param path - host path whose basename becomes the download name.
 * @returns the value for the Content-Disposition header.
 */
export declare function contentDispositionFor(path: string): string;
/** Basename of one host path, used as the download filename. */
export declare function baseNameOf(path: string): string;
/**
 * Serve one download request against the composed filesystem.
 * @param request - the fenced /api request (GET or HEAD).
 * @param fs - composed filesystem the execution world uses.
 * @param maxBytes - policy ceiling; a larger file answers 413 before any read.
 * @returns the streaming response described in the module comment.
 */
export declare function serveFileDownload(request: Request, fs: DownloadFs, maxBytes?: number): Promise<Response>;
//# sourceMappingURL=file-download.d.ts.map