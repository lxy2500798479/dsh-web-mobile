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
export declare const FILE_DOWNLOAD_ROUTE = "api/mobile-nav.file.download";
/**
 * Above this size iOS goes through the streamed download instead of the share
 * sheet: the share path materializes the file in the page as a Blob, and
 * Safari's tab memory makes large blobs a crash risk.
 */
export declare const SHARE_MAX_BYTES: number;
/** Build the download URL for one absolute host path. */
export declare function fileDownloadRoute(path: string): string;
/** Basename of one host path, used as the browser-side file name. */
export declare function fileNameFromPath(path: string): string;
/** Failure class a delivery can announce to the user. */
export type FileDeliveryFailure = 'too-large' | 'missing' | 'failed';
/** Settled outcome of one delivery attempt. */
export type FileDeliveryOutcome = {
    readonly kind: 'shared';
} | {
    readonly kind: 'saved';
} | {
    readonly kind: 'cancelled';
} | {
    readonly kind: 'failed';
    readonly failure: FileDeliveryFailure;
};
/** Device-side surface handoff; every part injected for tests. */
export interface FileDeliveryEnvironment {
    /** HEAD probe: HTTP status, or the file size when the header is present. */
    headFile(url: string): Promise<{
        ok: true;
        size: number | null;
    } | {
        ok: false;
        status: number;
    }>;
    /** Whole-body read for the share path (bounded by the caller's size gate). */
    fetchBlob(url: string): Promise<{
        ok: true;
        blob: Blob;
    } | {
        ok: false;
        status: number;
    }>;
    /** Whether this device should use the share sheet at all. */
    canShareFiles(): boolean;
    share(file: File): Promise<void>;
    /** Hand the route URL to the browser as a download (streamed, no JS memory). */
    download(url: string): void;
}
/**
 * Download one host file onto the device: probe, then share sheet (small iOS
 * files) or a browser-native streamed download.
 * @param path - absolute host path of the file, as the preview metadata reports it.
 * @param env - probe, byte carrier, and handoff surfaces.
 * @returns the settled outcome; failures name their class for the button's label.
 */
export declare function deliverFile(path: string, env: FileDeliveryEnvironment): Promise<FileDeliveryOutcome>;
/** Environment backed by the page: same-origin fetch, Web Share on iOS, anchor download. */
export declare function createBrowserEnvironment(): FileDeliveryEnvironment;
//# sourceMappingURL=file-download.d.ts.map