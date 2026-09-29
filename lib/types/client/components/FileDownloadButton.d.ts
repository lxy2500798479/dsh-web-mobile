import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../i18n/locales.ts';
/**
 * 文件下载控件（客户线，2026-09-29）——宿主 Web 端没有任何「把文件存到本机」
 * 的入口（预览只读渲染；native open 只在有 Host desktop 的桌面版存在），而
 * 客户入口是 iOS PWA：standalone 下 a[download]/blob 下载被 iOS 吞掉。本控件
 * 占据官方为第三方预留的两个插槽：
 *  - `sidebar.right.tab.document.actions`：文档预览页头（UI 正常渲染时）；
 *  - `sidebar.right.tab.document.unpreviewable`：文件不可预览时的空态（如
 *    镜像缺 office 转换服务），那里通常是客户最需要「换个方式拿走文件」的点。
 * 两个插槽 owner 都提供 `absolutePath`；字节走本插件宿主半区新挂的流式下载路由
 * （`/api/mobile-nav.file.download`，500 MiB 上限、分窗读取不占内存），落盘策略
 * （HEAD 探测 → iOS 小文件走 Web Share 面板、其余走浏览器流式下载）在
 * core/file-download.ts。
 *
 * 刻意全宽度显示：客户的桌面浏览器同样没有下载入口，所以此控件不在
 * misc.css.ts 的桌面遮蔽名单里。槽位在本代宿主缺席时 `slots.inject` 静默
 * 惰性化（旧宿主零副作用），机制与仓库其余跨代特性一致。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /** 文档页头贡献：预览文件 Host 路径已知后渲染，owner 给出绝对路径。 */
        'sidebar.right.tab.document.actions': {
            kind: 'list';
            scope: 'session';
            owner: {
                readonly absolutePath: string;
            };
        };
        /** 不可预览空态贡献：与页头同一 owner。 */
        'sidebar.right.tab.document.unpreviewable': {
            kind: 'list';
            scope: 'session';
            owner: {
                readonly absolutePath: string;
            };
        };
    }
}
/** 文档预览页头的紧凑下载控件。 */
export declare function FileDownloadButton(props: PropsRuntime<'sidebar.right.tab.document.actions'> & PropsLocale<typeof NS>): import("react").JSX.Element;
/** 不可预览空态的强调下载控件（图标 + 文案，站在 Retry 的位置）。 */
export declare function FileDownloadEmpty(props: PropsRuntime<'sidebar.right.tab.document.unpreviewable'> & PropsLocale<typeof NS>): import("react").JSX.Element;
//# sourceMappingURL=FileDownloadButton.d.ts.map