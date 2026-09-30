/**
 * HTML 交付物「交互预览」的注册数据与判据（客户线，2026-09-30）。
 *
 * 背景（为什么需要这一件）：
 *   宿主把 HTML 文件的预览分两档渲染，由 `documentPreviews` 注册表按实现分发——
 *     · 交互档（`priority: 'extension'` 或门开时的官方实现）：iframe
 *       `sandbox="allow-scripts"`（不透明源），页面脚本可跑；
 *     · 静态档（官方 builtin 的降级路）：DOMPurify 清洗 + 硬 CSP `script-src 'none'`
 *       ——页面里任何脚本都被拦。
 *   官方把「交互档」挂在开发者工具门（`configForms.developerTools.enabled`）上；
 *   本插件客户形态为遮「轨迹/代码差异/预设切换」把该门同步成关 ⇒ 客户实例上所有
 *   HTML 交付物都落到静态档 ⇒ pyecharts / echarts 这类全靠脚本绘图的页面一片空白
 *   （2026-09-30 客户实测：控制台 `Blocked script execution in 'about:srcdoc' …`）。
 *
 * 方案：本插件注册自己的 HTML 预览实现，**与开发者门彻底解耦**——永远走 allow-scripts
 * 沙箱渲染。注册表语义（官方源码实测）：插件实现（`priority: 'extension'`）排在
 * builtin 之前，默认选中 = 候选第一位 `candidates[0]`，因此本实现默认接管
 * `.html/.htm` 的预览；官方 builtin 仍在注册表里（工具条可切回、旧宿主可兜底）。
 *
 * 安全姿态与官方交互档一致：iframe `sandbox="allow-scripts"`（**不带**
 * allow-same-origin）⇒ 不透明源，脚本可跑但触不到宿主（parent / storage / cookie
 * 全隔离）。宿主侧额外收口：`candidates[0]` 的组件按 keyed slot 分发，内容由宿主的
 * workspace 读通道喂入（`loading: 'bytes-complete'`），没有新的网络面。
 *
 * 已知边界（刻意，第一版不做）：与官方交互档相比不做「相对资源打包」——HTML 里
 * 引用同目录图片/CSS/JS 的相对路径不会解析（blob/srcdoc 基准下无同目录可读）。
 * 当前客户交付物（data-report 技能：pyecharts / plotly，自包含 + 外链 CDN）不受
 * 影响；需要时再扩 readRelated（官方同款 workspaceFiles.readBytes 通道）。
 */
/** 本插件 HTML 预览实现的注册 id（也是 keyed slot 的分发 key；必须与官方 builtin 不同）。 */
export declare const HTML_LIVE_PREVIEW_ID = "dsh-web-mobile/html-live-preview";
/** 官方 builtin HTML 实现 id（对照用：注册重名会抛 `duplicate implementation`）。 */
export declare const BUILTIN_HTML_PREVIEW_ID = "@deepseek-ai/dsh-client-ui-sidebar-documentpreview/html";
/** 宿主 `documentPreviews` 注册表的一条实现（官方 DocumentPreviewDefinition 的最小投影）。 */
export interface DocumentPreviewDefinition {
    readonly id: string;
    readonly extensions: readonly string[];
    readonly priority?: 'builtin' | 'extension';
    readonly title: () => string;
    readonly loading: 'text-pages' | 'bytes-complete' | 'renderer';
    readonly wrap?: boolean;
}
/** 宿主 `documentPreviews` 注册表服务面（0.1.7 线宿主提供；更早宿主没有 → 整段惰性）。 */
export interface DocumentPreviewsFace {
    register(definition: DocumentPreviewDefinition): () => void;
}
/** 文档主体内容（官方 DocumentContent 的最小投影；本实现只消费 complete bytes 一档）。 */
export type HtmlPreviewContent = {
    readonly kind: 'bytes';
    readonly data: Uint8Array;
} | {
    readonly kind: 'text' | 'renderer';
};
/**
 * 语言判定：预览实现的工具条标题跟随浏览器语言（zh 主、en 兜底；拿不到语言环境时
 * 按客户线默认取中文）。纯函数，供单测。
 * @param language - `navigator.language` 或等价串（可空）。
 * @returns 是否应使用中文文案。
 */
export declare function prefersChinese(language: string | null | undefined): boolean;
/**
 * 构造本插件 HTML 预览实现的注册数据（纯函数，供单测；注册调用在 effects/html-preview.ts）。
 * @returns 注册表条目：extension 优先级接管 .html/.htm，bytes 完整喂入，不消费 wrap。
 */
export declare function htmlPreviewDefinition(): DocumentPreviewDefinition;
/**
 * 把文档字节解成 iframe 用的 HTML 文本（UTF-8；坏字节按替换字符容错，不抛）。
 * @param data - 宿主喂入的完整文件字节。
 * @returns 文本形态的 HTML。
 */
export declare function decodeHtmlBytes(data: Uint8Array): string;
//# sourceMappingURL=html-preview.d.ts.map