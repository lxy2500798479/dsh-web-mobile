import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** 该按钮是否属于「浏览器桌面」入口（纯函数，供单测）。 */
export declare function isBrowserDesktopLabel(label: string | null | undefined): boolean;
/** 该对话框是否属于「内测声明」弹窗（纯函数，供单测）。 */
export declare function isWelcomeNoticeLabel(label: string | null | undefined): boolean;
/** 该菜单行是否属于「模型」命令（纯函数，供单测）。 */
export declare function isModelCommandRow(text: string | null | undefined): boolean;
/** 该面板行是否属于要隐藏的入口（纯函数，供单测）。 */
export declare function shouldHidePanelLabel(label: string | null | undefined): boolean;
/**
 * 对 root 做一遍客户形态遮蔽（设置座位 + 面板行 + 文件浏览按钮 / 预设 chip /
 * 浏览器桌面入口 / 触发候选菜单「模型」行 / 内测声明弹窗）。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export declare function applyCustomerMode(root: ParentNode): boolean;
/**
 * 安装部署形态（全视口生效）。
 * @param ctx - client 根上下文。
 */
export declare function installDeploymentMode(ctx: ClientContext): void;
/** 同一目标版本最多自动刷新的次数（防刷新循环）。 */
export declare const AUTO_RELOAD_MAX_PER_TARGET = 2;
/** 记账键（sessionStorage：跨刷新保留、随标签页生灭）。 */
export declare const AUTO_RELOAD_STORAGE_KEY = "dsh-web-mobile:auto-reload";
/** 自动刷新记账：目标版本（服务端启动图 rev）与已尝试的刷新次数。 */
export interface AutoReloadState {
    target: string;
    attempts: number;
}
/**
 * 读一个 `__DSH_BOOT__` 候选值的启动图 rev。形态不符（旧宿主/异常页）返回 null。
 * @param value - 任意 `__DSH_BOOT__` 候选值。
 * @returns rev 字符串，或 null。
 */
export declare function bootRevOf(value: unknown): string | null;
/**
 * 从宿主渲染的 index HTML 文本里抽启动图 rev（内联行
 * `globalThis["__DSH_BOOT__"] = {…}`；宿主对 JSON 值做过 `\u003c` 转义，不含裸
 * `</script`）。抽不到（旧宿主格式/登录页/中间层改写）返回 null，调用方静默跳过。
 * @param html - index 响应文本。
 * @returns rev 字符串，或 null。
 */
export declare function bootRevInHtml(html: string): string | null;
/**
 * 该目标版本是否还允许自动刷新（同目标已刷满上限则放弃）。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则允许）。
 * @returns 是否允许刷新。
 */
export declare function autoReloadAllowed(fresh: string, state: AutoReloadState | null): boolean;
/**
 * 记一次「即将发生」的刷新：换目标从 1 起算，同目标累加。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则新建）。
 * @returns 新记账状态。
 */
export declare function autoReloadNextState(fresh: string, state: AutoReloadState | null): AutoReloadState;
/** 焦点是否在输入类控件上（正在打字，刷新应推迟而不是打断）。 */
export declare function isEditableFocused(doc: Document): boolean;
/**
 * 安装页面版本跟随（自动刷新；全视口生效——桌面标签页同样会挂着旧版本）。
 * @param ctx - client 根上下文。
 */
export declare function installAutoReload(ctx: ClientContext): void;
//# sourceMappingURL=deployment-mode.d.ts.map