import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { SHIBEI_BRAND_NAME, isHostHeroHeadline, isHostPreviewBadgeText } from '../core/brand.ts'

/**
 * 首屏换牌（2026-09-28，拾贝起源部署）：标语替换 + 「预览版」徽标移除。
 *
 * 官方把「探索未至之境」硬写在 `conversation` 命名空间字典（`hero.headline`），
 * 「预览版」徽标同样只有字典 + 类名（`hero.preview` / CSS 本地名 `previewBadge`），
 * 两者都没有 slot、也没有品牌配置面；`locale.register` 对同命名空间同 locale 的
 * 重复注册会直接抛 `already has locale`（dsh-client-locale 的 register 语义），
 * 所以只能做 DOM 干预，且合并为同一个 pass：
 *
 * - 标语替换 = `[class*="titleGroup"]` 下的直接子 span 中，文本**精确**等于宿主原文
 *   （zh/en 两套）的那个——聊天内容里出现同样文字不会被误伤（不在 titleGroup 内）。
 * - 徽标移除 = 同层 span 中 class 含 `previewBadge`（首选锚点）或文本精确等于
 *   `预览版` / `Preview`（跨代兜底）的直接移除。
 *
 * React 之后不会再回写这些节点（`t()` 输出恒定，diff 无变化），原文/徽标只在整块
 * 重挂（开新会话、视图切换、插件重载）时回来；观察器只对「新增子树」与
 * 「titleGroup 内的变化」做脏标记，命中才整树处理一遍——聊天流式输出的高频
 * childList 不会带来整树扫描。处理幂等。不做移动断点门控：品牌应与视口无关地一致。
 */

/** 宿主首屏的标语容器（CSS Module 本地名；跨代兼容靠子串匹配，缺席即惰性）。 */
const TITLE_GROUP_SELECTOR = '[class*="titleGroup"]'

/** 宿主徽标的 class 本地名锚点。 */
const PREVIEW_BADGE_CLASS_TOKEN = 'previewBadge'

/**
 * 对 root 做一遍首屏换牌：替换标语、移除「预览版」徽标。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export function applyHeroRebrand(root: ParentNode): boolean {
  let changed = false
  for (const group of root.querySelectorAll(TITLE_GROUP_SELECTOR)) {
    // 快照迭代：循环体内会 remove() 子节点。
    for (const child of [...group.children]) {
      if (child.tagName !== 'SPAN') continue
      if (isHostHeroHeadline(child.textContent)) {
        child.textContent = SHIBEI_BRAND_NAME
        changed = true
        continue
      }
      const className = typeof child.className === 'string' ? child.className : ''
      if (className.includes(PREVIEW_BADGE_CLASS_TOKEN) || isHostPreviewBadgeText(child.textContent)) {
        child.remove()
        changed = true
      }
    }
  }
  return changed
}

/**
 * 安装首屏换牌（全视口生效）。
 * @param ctx - client 根上下文。
 */
export function installBrandHeadline(ctx: ClientContext): void {
  ctx.effect(() => {
    applyHeroRebrand(document)
    let pending = false
    const flush = (): void => {
      pending = false
      applyHeroRebrand(document)
    }
    const requestFlush = (): void => {
      if (pending) return
      pending = true
      requestAnimationFrame(flush)
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== 'childList') continue
        if (
          record.target instanceof Element &&
          record.target.closest(TITLE_GROUP_SELECTOR) !== null
        ) {
          requestFlush()
          return
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (
            node.matches(TITLE_GROUP_SELECTOR) ||
            node.querySelector(TITLE_GROUP_SELECTOR) !== null
          ) {
            requestFlush()
            return
          }
        }
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
    }
  }, 'dsh-web-mobile: brand headline')
}
