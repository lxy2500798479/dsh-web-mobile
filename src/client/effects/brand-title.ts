import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { SHIBEI_LOGO_URL, applyBrandTitle } from '../core/brand.ts'

/**
 * 浏览器标签品牌换牌（2026-09-29，拾贝起源部署）：**标题 + 图标**。
 *
 * 两者同属「浏览器标签 chrome」、同一触发机制（宿主 HTML 写死、无 slot 无配置面 ⇒
 * 客户端 DOM 覆盖），合并为一个效果模块（effects/ 模块数被仓库自检当作文档断言，
 * 拆文件需同步 AGENTS.md；那是受写保护的指令文件，留待用户在线时再拆）。
 *
 * **标题**：宿主发布构建把 `DSH_CLIENT_TITLE` 烘焙进客户端包
 * （dsh-client-ui-brand-official README：「浏览器标题是构建环境的事」），运行时由
 * ui-layout 的 DocumentTitle 持续写入 document.title —— 裸产品名，或
 * 「`<会话名> — <产品名>`」（会话切换与流式标题更新都会重写）。运行时不读环境
 * 变量、也没有品牌配置面 ⇒ 与首屏标语同路：客户端插件做 DOM 覆盖。
 * 机制：观察 `<title>` 子树的文本变化，把宿主的「DeepSeek Harness」替换为品牌名
 * （保留「会话名 — 」前缀）；写入自身也会触发观察回调，但替换幂等（无宿主要素
 * 即 no-op），不会自激。曾评估 nginx `sub_filter` 在边缘替换（不需要插件在场即可
 * 生效），2026-09-29 按用户口径回退 —— 品牌/业务逻辑不放网关写死，归项目（本插件）。
 *
 * **图标**：宿主 shell HTML 写死两个 SVG favicon
 * （`<link rel="icon" type="image/svg+xml" href="./favicon-dark.svg"
 * media="(prefers-color-scheme: dark)">` + 亮色变体）。把 `rel` 含 `icon` 的 link
 * 重指到品牌 logo，并修正 `type`（logo 是 PNG；不改 type 的话浏览器可能因 SVG
 * 声明直接跳过该 link）；挂载全量一遍 + 观察 `<head>` 子树新增（宿主整块重挂时
 * 补一次），幂等、写入不回环。
 * 边界：`apple-touch-icon` 不在射程（`rel~="icon"` 是单词匹配，不会命中
 * `apple-touch-icon`；且 iOS 桌面图标在「添加到主屏幕」时快照，运行时改不了），
 * PWA 安装名/manifest 是浏览器直接拉取的静态文件 —— 二者同属部署层范畴。
 *
 * 不做视口门控：品牌应与视口无关地一致。
 */
export function installBrandTitle(ctx: ClientContext): void {
  ctx.effect(() => {
    const flush = (): void => {
      const next = applyBrandTitle(document.title)
      if (next !== document.title) document.title = next
    }
    flush()
    const observer = new MutationObserver(flush)
    const title = document.querySelector('title')
    if (title !== null) {
      observer.observe(title, { childList: true, characterData: true, subtree: true })
    }
    return () => {
      observer.disconnect()
    }
  }, 'dsh-web-mobile: brand title')
}

/** 浏览器标签图标（favicon）DOM 覆盖 —— 与标题同一模块，机制与边界见文件头。 */
export function installBrandFavicon(ctx: ClientContext): void {
  ctx.effect(() => {
    const apply = (): void => {
      for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) {
        if (link.getAttribute('href') !== SHIBEI_LOGO_URL) {
          link.setAttribute('href', SHIBEI_LOGO_URL)
        }
        if (link.getAttribute('type') !== 'image/png') {
          link.setAttribute('type', 'image/png')
        }
      }
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
    }
  }, 'dsh-web-mobile: brand favicon')
}
