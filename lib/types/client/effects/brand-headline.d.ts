import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * 对 root 做一遍首屏换牌：替换标语、移除「预览版」徽标。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export declare function applyHeroRebrand(root: ParentNode): boolean;
/**
 * 安装首屏换牌（全视口生效）。
 * @param ctx - client 根上下文。
 */
export declare function installBrandHeadline(ctx: ClientContext): void;
//# sourceMappingURL=brand-headline.d.ts.map