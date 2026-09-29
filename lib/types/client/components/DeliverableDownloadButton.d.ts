import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../i18n/locales.ts';
/**
 * 聊天内「交付卡片」的下载控件（客户线，2026-09-29 第二版）。
 *
 * 店主实机反馈：卡片右侧那个宿主控件（ui-open-in-app 的「在文件夹中打开/应用
 * 打开」；实例开了 DSH_DESKTOP_ENABLED，宿主以为有桌面，于是它被渲染出来了）
 * 在容器形态里点了没有任何结果——客户想要的直接动作是「把文件拿走」。本控件占
 * 宿主为第三方预留的 `deliverables.file.actions` 槽：客户形态下宿主那个控件由
 * CSS 遮蔽（effects/deployment-mode.ts），此处补上「下载」。预览不受影响——
 * 卡片整体仍是预览覆盖层（宿主 cardPreview）。
 *
 * 路径来源：槽的 owner 只给会话内事件坐标（actionUrl），没有绝对路径；卡片自身
 * 的预览覆盖层把 resolveWorkspacePath(cwd, file.path) 写在 title 上，点击时从
 * 所属卡片的 DOM 读——读不到或不像绝对路径就报「下载失败」，绝不猜路径。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /** 交付卡片动作区（宿主 ui-deliverables；owner 字段不使用，只借位置）。 */
        'deliverables.file.actions': {
            kind: 'list';
            scope: 'session';
            owner: {
                readonly actionUrl: string;
                readonly available: boolean;
                readonly pending: boolean;
                readonly onAction: (action: 'open' | 'reveal', application?: string) => Promise<unknown>;
            };
        };
    }
}
/**
 * 读一张交付卡片上记录的宿主绝对路径（卡片预览覆盖层的 title）。
 * @param card - 卡片根节点（找不到时为 null）。
 * @returns 绝对路径，或 null（无卡片 / 无 title / 形状不像绝对路径）。
 */
export declare function presentedPathOf(card: Element | null): string | null;
/** 交付卡片的紧凑下载控件。 */
export declare function DeliverableDownloadButton(props: PropsRuntime<'deliverables.file.actions'> & PropsLocale<typeof NS>): import("react").JSX.Element;
//# sourceMappingURL=DeliverableDownloadButton.d.ts.map