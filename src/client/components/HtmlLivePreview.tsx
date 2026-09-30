import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { decodeHtmlBytes } from '../core/html-preview.ts'
import type { HtmlPreviewContent } from '../core/html-preview.ts'
import { NS } from '../i18n/locales.ts'

/**
 * HTML 交付物「交互预览」主体（客户线，2026-09-30）。
 *
 * 占官方 keyed 槽 `sidebar.right.tab.document`（按实现 id 分发）：本插件在
 * `documentPreviews` 注册表里以 extension 优先级注册 `HTML_LIVE_PREVIEW_ID`
 * （见 core/html-preview.ts 的头注释——官方交互档被开发者门关死、静态档拦脚本，
 * 客户交付的 pyecharts 一类页面因此空白），宿主按 `candidates[0]` 选中本实现后，
 * 用这把 key 渲染本组件，并把文件字节直接喂进 `content`（loading: 'bytes-complete'）。
 *
 * 渲染姿态 = 官方交互档同款：`sandbox="allow-scripts"`（**不带** allow-same-origin）
 * ⇒ 不透明源里跑页面脚本，但 parent / storage / cookie 全部隔离，触不到宿主。
 * 2026-09-30 本机实测（Chrome + CDP）：沙箱 iframe 脚本可执行、`contentDocument`
 * 为 null（不可穿透）。几何对齐官方 `.frame`：块级、撑满、min-height 240。
 *
 * 槽位在旧宿主缺席时静默惰性（slot 未声明 → inject 不触发）；注册调用与客户形态
 * 门控见 effects/html-preview.ts。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 文档预览主体（官方 keyed 槽；本插件只消费 bytes 一档的内容）。 */
    'sidebar.right.tab.document': {
      kind: 'keyed'
      scope: 'session'
      owner: {
        /** 宿主装载好的文件内容；`loading: 'bytes-complete'` 下 bytes 一档必到。 */
        readonly content: HtmlPreviewContent
      }
    }
  }
}

/** 组件输入：官方最小 owner（content）+ 本命名空间文案。 */
export type HtmlLivePreviewProps = PropsRuntime<'sidebar.right.tab.document'> & PropsLocale<typeof NS>

/**
 * 渲染交互预览 iframe（`srcDoc` + allow-scripts 沙箱）。
 * @param props - 宿主喂入的文件内容 + `mobileNav` 命名空间文案。
 * @returns 预览 iframe；内容尚未到齐（非 bytes 一档）时返回 null，由宿主维持装载态。
 */
export function HtmlLivePreviewBody({ content, t }: HtmlLivePreviewProps): ReactNode {
  const html = useMemo(
    () => (content.kind === 'bytes' ? decodeHtmlBytes(content.data) : null),
    [content],
  )
  if (html === null) return null
  return (
    <iframe
      data-mobile-nav="html-live-preview"
      sandbox="allow-scripts"
      srcDoc={html}
      title={t('htmlPreviewFrame')}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        minHeight: '240px',
        border: 'none',
        background: 'var(--dsw-alias-bg-base)',
      }}
    />
  )
}
