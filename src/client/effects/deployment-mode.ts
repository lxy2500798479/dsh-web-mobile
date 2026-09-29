import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { config } from '../config.ts'

/**
 * 部署形态（2026-09-28，中贝通信生产形态）：按 `config.devMode` 收/放三类入口。
 *
 * 两条路线：
 *  1) 宿主官方门 —— 轨迹 / 本轮代码差异 / 预设切换 由宿主 `ui-settings` 命名空间的
 *     `developerTools` 偏好门控（宿主默认 true = 全开）。这里在启动后把它同步成
 *     `config.devMode`：官方各自渲染器自行隐藏，零 DOM 侵入。旧宿主（rc.6 线）没有
 *     `configForms` 服务 → inject 回调不触发，整段惰性，不报错。
 *  2) DOM 遮蔽 —— 设置 / 浏览器 / 插件 面板行没有官方门，按行隐藏：
 *     设置 = `[data-slot="sidebar.settings"]` 座位；浏览器/插件 = 侧栏面板行
 *     （`button[class*="panelRow"]`，按 aria-label 命中，zh/en 双语，未命中静默）。
 *
 * 全部改动幂等、随整块重挂自动重放；不做断点门控（产品形态与视口无关）。
 *
 * 2026-09-29 扩展（店主拍板「用户用不上」，客户形态一并遮蔽）：
 *  ① 移动壳「文件浏览」按钮（`data-mobile-nav="files"`，右上角文件夹图标）；
 *  ② 会话头部的预设 chip（`conversation.session.header.actions` 槽里的「标准模式」
 *     标签；槽容器 display:contents 无盒，遮蔽其 span 子元素）；
 *  ③ 侧栏页脚「浏览器桌面」入口（@runzhliu/dsh-browser-desktop，按文案指纹 zh/en 匹配）；
 *  ④ 「内测声明」弹窗（宿主 settings-models 的 welcome-notice 步骤；远程浏览器走
 *     memory-mode 每次载入必弹且遮罩拦点击）——**处理方式 = 使其对用户不可见且不阻塞**：
 *     ① 模块求值即注入 CSS（早于设置壳渲染 ⇒ 从未被绘制，无闪现）把该 overlay 整体
 *        `display:none`（:has 选择器按 aria-label 命中，`body > div:not(#root)` 兜底防误伤 App 根）；
 *     ② 摘掉应用根 #root 的 inert（未确认期间宿主把它置 inert，真实触摸会被整个吞掉；
 *        程序化 click 不受影响，曾据此误判过「无阻塞」）；
 *     ③ **不代点**（店主口径：不让用户看到这个窗口即可，不触发其确认动作）；
 *     ④ 观察器盯住 inert 属性，宿主重加即再摘。
 *  ⑤ ui-open-in-app 的「在文件夹中打开」控件（预览页头 + 交付卡片；容器里没有
 *     可用的本机文件管理器，宿主因实例开了 DSH_DESKTOP_ENABLED 而渲染它，客户
 *     点它没有任何结果——2026-09-29 店主实机「点了也没有用」）。CSS 首帧遮蔽；
 *     交付卡片的下载位由本插件 DeliverableDownloadButton 补上。
 * 三者只在手机壳 / 会话 active 期渲染，桌面视口天然不命中（死规则）。
 */

/** 要隐藏的面板行（aria-label 精确匹配；双语兜底）。 */
const HIDDEN_PANEL_LABELS = new Set(['插件', 'Plugins', '浏览器', 'Browser'])

const PANEL_ROW_SELECTOR = 'button[class*="panelRow"]'
const SETTINGS_SEAT_SELECTOR = '[data-slot="sidebar.settings"]'

/** 会话头部动作槽（宿主；display:contents，内部 span = 预设 chip「标准模式」）。 */
const HEADER_ACTIONS_SLOT_SELECTOR = '[data-slot="conversation.session.header.actions"]'

/** 客户形态额外遮蔽的固定控件（选择器命中即隐藏）。 */
const EXTRA_HIDDEN_SELECTORS = [
  // 移动壳「文件浏览」按钮（右上角文件夹图标；data-mobile-nav 为插件自有稳定标记）
  '[data-mobile-nav="files"]',
  // 预设 chip 标签（见文件头 §扩展②；拼接写法避免模板字符串）
  HEADER_ACTIONS_SLOT_SELECTOR + ' > span',
] as const

/** 「浏览器桌面」入口按钮文案指纹（小写包含匹配；zh 为主、en 兜底）。 */
const BROWSER_DESKTOP_HINTS = ['浏览器桌面', 'browser desktop', 'take over'] as const

/** 该按钮是否属于「浏览器桌面」入口（纯函数，供单测）。 */
export function isBrowserDesktopLabel(label: string | null | undefined): boolean {
  if (typeof label !== 'string') return false
  const lowered = label.toLowerCase()
  return BROWSER_DESKTOP_HINTS.some((hint) => lowered.includes(hint))
}

/** 「内测声明」弹窗的 aria-label 指纹（宿主 settings-models 的 welcome-notice 步骤）。 */
const WELCOME_NOTICE_LABELS = new Set(['内测声明', 'Internal Testing Notice'])

/** 该对话框是否属于「内测声明」弹窗（纯函数，供单测）。 */
export function isWelcomeNoticeLabel(label: string | null | undefined): boolean {
  return typeof label === 'string' && WELCOME_NOTICE_LABELS.has(label.trim())
}

/** 欢迎弹窗对话框选择器（zh/en aria-label；观察器与代确认共用）。 */
const WELCOME_DIALOG_SELECTOR = [
  '[role="dialog"][aria-label="内测声明"]',
  '[role="dialog"][aria-label="Internal Testing Notice"]',
].join(', ')

/**
 * 客户形态「首帧隐形」样式（模块求值即注入——早于设置壳渲染，弹窗从未被绘制过，
 * 不是「渲染后再隐藏」）。`body > div:not(#root)` 限定在门户出去的门层，防误伤 App 根。
 */
const CUSTOMER_STEALTH_CSS = [
  'body > div:not(#root):has([role="dialog"][aria-label="内测声明"]) { display: none !important; }',
  'body > div:not(#root):has([role="dialog"][aria-label="Internal Testing Notice"]) { display: none !important; }',
  // ui-open-in-app 的「在文件夹中打开/应用打开」（预览页头与交付卡片共用标记
  // data-open-target="file"）：容器形态里没有可用的本机文件管理器，是死按钮
  // （2026-09-29 店主实机反馈）。首帧即隐形；后续新节点天然命中，无需观察器。
  '[data-open-target="file"] { display: none !important; }',
].join('\n')

if (!config.devMode && typeof document !== 'undefined') {
  const STEALTH_TAG_ID = 'dsh-web-mobile/customer-stealth'
  if (document.querySelector('style[data-plugin-css="' + STEALTH_TAG_ID + '"]') === null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-web-mobile'
    tag.dataset.pluginCss = STEALTH_TAG_ID
    tag.textContent = CUSTOMER_STEALTH_CSS
    document.head.appendChild(tag)
  }
}

/** 观察器触发用：任一客户形态遮蔽目标的选择器合集。 */
const CUSTOMER_TARGET_SELECTOR = [
  SETTINGS_SEAT_SELECTOR,
  PANEL_ROW_SELECTOR,
  ...EXTRA_HIDDEN_SELECTORS,
  'button[aria-label*="浏览器桌面"]',
  WELCOME_DIALOG_SELECTOR,
].join(', ')

/** 该面板行是否属于要隐藏的入口（纯函数，供单测）。 */
export function shouldHidePanelLabel(label: string | null | undefined): boolean {
  return typeof label === 'string' && HIDDEN_PANEL_LABELS.has(label.trim())
}

/**
 * 对 root 做一遍客户形态遮蔽（设置座位 + 目标面板行 + 文件浏览按钮 / 预设 chip /
 * 浏览器桌面入口 / 内测声明弹窗）。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export function applyCustomerMode(root: ParentNode): boolean {
  let changed = false
  for (const seat of root.querySelectorAll(SETTINGS_SEAT_SELECTOR)) {
    if (seat instanceof HTMLElement && seat.style.display !== 'none') {
      seat.style.display = 'none'
      changed = true
    }
  }
  for (const row of root.querySelectorAll(PANEL_ROW_SELECTOR)) {
    if (!(row instanceof HTMLElement)) continue
    if (!shouldHidePanelLabel(row.getAttribute('aria-label'))) continue
    if (row.style.display !== 'none') {
      row.style.display = 'none'
      changed = true
    }
  }
  for (const selector of EXTRA_HIDDEN_SELECTORS) {
    for (const element of root.querySelectorAll(selector)) {
      if (element instanceof HTMLElement && element.style.display !== 'none') {
        element.style.display = 'none'
        changed = true
      }
    }
  }
  for (const button of root.querySelectorAll('button[aria-label]')) {
    if (!(button instanceof HTMLElement)) continue
    if (!isBrowserDesktopLabel(button.getAttribute('aria-label'))) continue
    if (button.style.display !== 'none') {
      button.style.display = 'none'
      changed = true
    }
  }
  for (const dialog of root.querySelectorAll(WELCOME_DIALOG_SELECTOR)) {
    if (!(dialog instanceof HTMLElement)) continue
    if (!isWelcomeNoticeLabel(dialog.getAttribute('aria-label'))) continue
    // ① 遮父 overlay（含 backdrop mask）：首帧隐形主靠模块级 CSS；这里兜非 :has 环境。
    const overlay = dialog.parentElement instanceof HTMLElement ? dialog.parentElement : dialog
    if (overlay.style.display !== 'none') {
      overlay.style.display = 'none'
      changed = true
    }
    // ② 摘掉应用根的 inert：未确认期间宿主把 #root 置 inert，真实触摸会被整个吞掉
    //    （程序化 click() 不受 inert 限制——曾据此误判「无阻塞」，实际用户点不动）。
    const appRoot = document.getElementById('root')
    if (appRoot !== null && appRoot.hasAttribute('inert')) {
      appRoot.removeAttribute('inert')
      changed = true
    }
    // ③ 不代点「继续」：店主口径 = 用户看不到这个窗口即可，不触发宿主确认动作。
  }
  return changed
}

/** 宿主 configForms 服务面（0.1.7 线宿主提供；rc.6 线没有 → 整段惰性）。 */
interface DeveloperToolsFace {
  readonly enabled: { getSnapshot(): boolean }
  setEnabled(enabled: boolean): Promise<void>
}
interface ConfigFormsFace {
  readonly developerTools?: DeveloperToolsFace
}

/**
 * 安装部署形态（全视口生效）。
 * @param ctx - client 根上下文。
 */
export function installDeploymentMode(ctx: ClientContext): void {
  // 1) 官方门同步：等镜像就绪（本地 RPC，很快）再对账写入，避免加载竞态下误判。
  ctx.inject(['configForms'], (scope) => {
    const face = (scope as unknown as { configForms?: ConfigFormsFace }).configForms?.developerTools
    if (face === undefined) return
    const target = config.devMode
    const timer = setTimeout(() => {
      if (face.enabled.getSnapshot() === target) return
      face.setEnabled(target).catch((error: unknown) => {
        console.warn('[dsh-web-mobile] developerTools 同步失败（不影响聊天）', error)
      })
    }, 800)
    return () => clearTimeout(timer)
  })

  // 2) DOM 遮蔽（仅客户形态）：设置座位 + 浏览器/插件面板行 + 文件浏览按钮 /
  //    预设 chip / 浏览器桌面入口。
  ctx.effect(() => {
    if (config.devMode) return () => {}
    applyCustomerMode(document)
    let pending = false
    const flush = (): void => {
      if (!pending) return
      pending = false
      applyCustomerMode(document)
    }
    const requestFlush = (): void => {
      if (pending) return
      pending = true
      // rAF 在隐藏/后台页不触发（headless/后台标签实测 never），用 setTimeout 兜底双保险。
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush)
      setTimeout(flush, 120)
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        // 宿主把 #root 置 inert = 真实触摸点不动的根因；盯属性变化，重加即再摘。
        if (record.type === 'attributes') {
          if (record.attributeName === 'inert') {
            requestFlush()
            return
          }
          continue
        }
        if (record.type !== 'childList') continue
        const target = record.target
        if (
          target instanceof Element &&
          (target.closest(SETTINGS_SEAT_SELECTOR) !== null ||
            target.closest('nav[class*="panelList"]') !== null ||
            target.closest(HEADER_ACTIONS_SLOT_SELECTOR) !== null)
        ) {
          requestFlush()
          return
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (
            node.matches(CUSTOMER_TARGET_SELECTOR) ||
            node.querySelector(CUSTOMER_TARGET_SELECTOR) !== null
          ) {
            requestFlush()
            return
          }
        }
      }
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['inert'],
    })
    return () => {
      observer.disconnect()
    }
  }, 'dsh-web-mobile: customer mode')
}
