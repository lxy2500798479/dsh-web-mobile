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
import { isAbsolute } from 'node:path';
/** Absolute registration path; the browser half addresses its document-relative form. */
export const FILE_DOWNLOAD_PATH = '/api/mobile-nav.file.download';
/**
 * Served-size ceiling (bytes). Streaming makes this a policy bound, not a
 * memory bound: the response holds at most one window however large the file.
 */
export const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
/** Window size for one filesystem read. */
const DOWNLOAD_CHUNK_BYTES = 4 * 1024 * 1024;
/** Headers every response carries (success and failure alike). */
const BASE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};
/**
 * Failure responses carry a disposition too: a navigation-triggered download
 * that fails mid-flight must save an error file rather than replace the app
 * page with an error body.
 */
const ERROR_DISPOSITION = 'attachment; filename="download-error.txt"';
/** Filesystem error codes this route maps onto HTTP statuses. */
const FS_FAILURE_STATUS = {
    FS_NOT_FOUND: 404,
    FS_NOT_REGULAR_FILE: 403,
    FS_PERMISSION_DENIED: 403,
    FS_SANDBOX_DENIED: 403,
    FS_TOO_LARGE: 413,
    FS_ABORTED: 499,
};
/** Content type by file extension; unknown suffixes fall back to a binary type. */
export function contentTypeFor(path) {
    const base = baseNameOf(path).toLowerCase();
    const dot = base.lastIndexOf('.');
    const extension = dot <= 0 ? '' : base.slice(dot + 1);
    return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}
/**
 * RFC 6266 disposition: an ASCII fallback plus the UTF-8 form, so Chinese
 * file names survive however the client picks between them.
 * @param path - host path whose basename becomes the download name.
 * @returns the value for the Content-Disposition header.
 */
export function contentDispositionFor(path) {
    const name = baseNameOf(path);
    const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
/** Basename of one host path, used as the download filename. */
export function baseNameOf(path) {
    const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const base = cut >= 0 ? path.slice(cut + 1) : path;
    return base === '' ? 'download' : base;
}
const CONTENT_TYPES = {
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    log: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    markdown: 'text/markdown; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    json: 'application/json',
    xml: 'application/xml',
    yml: 'text/yaml; charset=utf-8',
    yaml: 'text/yaml; charset=utf-8',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
};
/** One failure response; never navigates the app away (see ERROR_DISPOSITION). */
function fail(request, status, message) {
    return new Response(request.method === 'HEAD' ? null : message, {
        status,
        headers: {
            ...BASE_HEADERS,
            'Content-Disposition': ERROR_DISPOSITION,
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}
/**
 * Windowed reader: one filesystem read per pull, so the response retains at
 * most DOWNLOAD_CHUNK_BYTES of the file at any moment.
 * @param fs - composed filesystem serving the reads.
 * @param target - resolved file target.
 * @param size - known file size; when absent the stream ends at the first empty window.
 * @param signal - request lifetime; aborts the active window read.
 * @returns the byte stream handed to the response.
 */
function streamDownload(fs, target, size, signal) {
    let offset = 0;
    return new ReadableStream({
        async pull(controller) {
            try {
                const remaining = size === undefined ? DOWNLOAD_CHUNK_BYTES : Math.min(DOWNLOAD_CHUNK_BYTES, size - offset);
                if (remaining <= 0) {
                    controller.close();
                    return;
                }
                const chunk = await fs.readByteRange(target, { offset, length: remaining }, signal);
                // A short or empty window means end of file.
                if (chunk.byteLength === 0) {
                    controller.close();
                    return;
                }
                offset += chunk.byteLength;
                controller.enqueue(chunk);
                if (size !== undefined && offset >= size)
                    controller.close();
            }
            catch (error) {
                controller.error(error);
            }
        },
    });
}
/**
 * Serve one download request against the composed filesystem.
 * @param request - the fenced /api request (GET or HEAD).
 * @param fs - composed filesystem the execution world uses.
 * @param maxBytes - policy ceiling; a larger file answers 413 before any read.
 * @returns the streaming response described in the module comment.
 */
export async function serveFileDownload(request, fs, maxBytes = MAX_DOWNLOAD_BYTES) {
    const rawPath = new URL(request.url).searchParams.get('path');
    if (rawPath === null || rawPath.length === 0)
        return fail(request, 400, 'missing path');
    if (rawPath.includes('\0') || !isAbsolute(rawPath))
        return fail(request, 400, 'absolute path required');
    try {
        const target = await fs.resolve(rawPath, { signal: request.signal });
        const info = await fs.stat(target, request.signal);
        if (info === undefined)
            return fail(request, 404, 'not found');
        if (info.type !== 'file')
            return fail(request, 403, 'not a regular file');
        const size = info.size;
        if (size !== undefined && size > maxBytes)
            return fail(request, 413, `file exceeds the ${maxBytes}-byte limit`);
        const headers = {
            ...BASE_HEADERS,
            'Content-Type': contentTypeFor(rawPath),
            'Content-Disposition': contentDispositionFor(rawPath),
        };
        if (size !== undefined)
            headers['Content-Length'] = String(size);
        if (request.method === 'HEAD')
            return new Response(null, { headers });
        return new Response(streamDownload(fs, target, size, request.signal), { headers });
    }
    catch (error) {
        const code = error?.code;
        if (typeof code !== 'string' || FS_FAILURE_STATUS[code] === undefined)
            throw error;
        return fail(request, FS_FAILURE_STATUS[code], code);
    }
}
//# sourceMappingURL=file-download.js.map