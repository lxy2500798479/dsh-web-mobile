import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { config } from '../config.ts'
import { HTML_LIVE_PREVIEW_ID, htmlPreviewDefinition } from '../core/html-preview.ts'
import type { DocumentPreviewsFace } from '../core/html-preview.ts'
import { HtmlLivePreviewBody } from '../components/HtmlLivePreview.tsx'
import { NS } from '../i18n/locales.ts'

/**
 * HTML 交付物「交互预览」安装器（客户线，2026-09-30）。
 *
 * 两步注册（机制与边界见 core/html-preview.ts 的头注释）：
 *  ① `documentPreviews.register`：以 extension 优先级注册本插件的 HTML 实现——
 *     插件实现排在官方 builtin 之前，默认选中 = 候选第一位 ⇒ 默认接管 .html/.htm；
 *  ② keyed 槽 `sidebar.right.tab.document` 注册渲染组件（key = 实现 id）：
 *     宿主按选中的实现 id 把文件字节喂进组件，组件用 allow-scripts 沙箱 iframe 渲染
 *     （见 components/HtmlLivePreview.tsx）。
 *
 * 安装条件与惰性：
 *  · 仅客户形态（`config.mask.master`）——开发/管理形态由官方交互档照常工作（门开），
 *    本实现不注册，避免把开发者预览换成无「相对资源打包」的简版；
 *  · `documentPreviews` 服务用可选注入（`ctx.inject`）——更早代宿主没有该服务时
 *    静默不触发，插件其余功能不受影响（与 deployment-mode 的 configForms 同理）；
 *  · keyed 槽经 `slots.inject` 等宿主声明，旧宿主无此槽时注册保持惰性。
 *
 * @param ctx - client 根上下文。
 */
export function installHtmlPreview(ctx: ClientContext): void {
  if (!config.mask.master) return
  ctx.inject(['documentPreviews'], (scope) => {
    const face = (scope as unknown as { documentPreviews?: DocumentPreviewsFace }).documentPreviews
    if (face === undefined) return
    ctx.effect(
      () => face.register(htmlPreviewDefinition()),
      'dsh-web-mobile: html live preview definition',
    )
    ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({
      name: 'sidebar.right.tab.document',
      key: HTML_LIVE_PREVIEW_ID,
      locale: NS,
    }, HtmlLivePreviewBody))
  })
}
