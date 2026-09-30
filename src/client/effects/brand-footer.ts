import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { SHIBEI_SUPPORT_LINE } from '../core/brand.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * 会话底部署名行（2026-09-30 店主口径）：客户形态在**会话最下面**显示
 * 「拾贝起源 技术支持」。
 *
 * 位置：宿主 composerStack（`[class*="_composerStack"]`）的**最后一个子节点之后** ——
 * 实测该容器自卡片（输入框）+ dock（轮/步/tok 状态行）之后还有 32px 下内边距，注入的这行
 * 正好落在状态行之下、贴着视口底。
 *
 * 门控：**移动端**（`MOBILE_QUERY`）。桌面端保持「移动插件 no-op」契约（唯一的既有例外是
 * 账号行，见 AGENTS.md）。
 *
 * 幂等：已存在同名标记就直接返回；React 重挂 composerStack 时由 `document.body` 的
 * childList 观察器补齐（微任务早于被动 effect，首帧不会漏）。卸载清干净。
 */
export function installBrandFooter(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: brand support footer', () => {
    const ensure = (): void => {
      const stack = document.querySelector('[class*="_composerStack"]')
      if (stack === null) return
      if (stack.querySelector(':scope > [data-mobile-nav="support-line"]') !== null) return
      const line = document.createElement('div')
      line.setAttribute('data-mobile-nav', 'support-line')
      line.textContent = SHIBEI_SUPPORT_LINE
      stack.append(line)
    }
    ensure()
    const observer = new MutationObserver(() => { ensure() })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      for (const el of document.querySelectorAll('[data-mobile-nav="support-line"]')) el.remove()
    }
  })
}
