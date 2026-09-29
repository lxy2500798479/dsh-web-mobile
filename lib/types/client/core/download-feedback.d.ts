/**
 * Download feedback: the settled-delivery toast and its message mapping.
 *
 * Why (2026-09-29 customer report「点了 下载成功了 也没有提示」): both handoffs
 * are silent by construction — the share sheet closes onto wherever the user
 * saved to, and the streamed download runs in the browser's own UI — so the
 * customer cannot tell whether the tap worked. Failures keep their labels on
 * the control itself; only settled successes toast here.
 */
import { type FileDeliveryOutcome } from './file-download.ts';
/** Which confirmation one settled outcome earns; cancelled/failed stay silent. */
export declare function downloadToastFor(outcome: FileDeliveryOutcome, path: string): {
    readonly key: 'downloadStarted' | 'downloadShared';
    readonly name: string;
} | null;
/**
 * Show (or refresh) the single success toast. One reusable node shared by both
 * download surfaces, so two quick taps cannot stack layers.
 * @param message - localized, already interpolated with the file name.
 */
export declare function showToast(message: string): void;
//# sourceMappingURL=download-feedback.d.ts.map