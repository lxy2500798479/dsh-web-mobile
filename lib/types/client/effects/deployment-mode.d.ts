import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** 该面板行是否属于要隐藏的入口（纯函数，供单测）。 */
export declare function shouldHidePanelLabel(label: string | null | undefined): boolean;
/**
 * 对 root 做一遍客户形态遮蔽（设置座位 + 目标面板行）。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export declare function applyCustomerMode(root: ParentNode): boolean;
/**
 * 安装部署形态（全视口生效）。
 * @param ctx - client 根上下文。
 */
export declare function installDeploymentMode(ctx: ClientContext): void;
//# sourceMappingURL=deployment-mode.d.ts.map