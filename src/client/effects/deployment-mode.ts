import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { config, maskEnabled, type MaskItemId } from '../config.ts'

/**
 * 部署形态（2026-09-28，中贝通信生产形态）：按 `config.mask`（总开关 + 逐项）收/放入口。
 * 2026-09-29 开关化：清单数据化为「每项一配置」——各执行器按项过滤（清单本体在
 * config.ts），本文件只做机制；回开/追加某项 = 改 `config.mask.items` 一行，
 * 守卫测试（tests/brand-rebrand.test.ts）对账两处清单与默认全遮。
 *
 * 两条路线：
 *  1) 宿主官方门 —— 轨迹 / 本轮代码差异 / 预设切换 由宿主 `ui-settings` 命名空间的
 *     `developerTools` 偏好门控（宿主默认 true = 全开）。这里在启动后把它同步成
 *     `mask.devtools` 项的语义值：官方各自渲染器自行隐藏，零 DOM 侵入。旧宿主（rc.6
 *     线）没有 `configForms` 服务 → inject 回调不触发，整段惰性，不报错。
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
 *     **2026-09-30 追补：同插件还有一个「浏览器桌面 · 人工接管」自动弹层**——agent 一旦
 *     调用其 `browser_open` 工具，宿主 `/browser-desktop/state` 的 revision 变化，前端
 *     750ms 轮询即自动 `setOpened(true)` 弹层（无需用户操作；客户实例公网无 6080 通路，
 *     浮层里的桌面地址必失败，纯惊吓源）。处理 = 客户形态一并遮蔽：CSS 首帧规则按
 *     aria-label 前缀命中（元素一创建即隐形，无闪现）+ DOM pass 收「任何 aria-label
 *     命中指纹的元素」（按钮 + `section[role="dialog"]` 浮层）。Agent 侧工具不受影响；
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
 *
 * 2026-09-30 扩展（店主实机反馈，客户形态再收三处；CSS 首帧遮蔽）：
 *  ① 会话头部「分身工作台」按钮（dsh-matrix-agent 注入的客户端入口）：客户实例
 *     上该入口读不到数据（空壳），店主口径 = 直接隐藏；
 *  ② 右侧栏「开始」页「新建终端」入口卡（官方 ui-sidebar-terminal 引导卡）：
 *     客户形态只保留其上的「工作区文件」卡；
 *  ③ ui-open-in-app 的「用文件管理器打开」会话头部控件（`directory` 取值）：
 *     容器形态没有可用的本机文件管理器——原 `file` 单值遮蔽扩为整族 `[data-open-target]`。
 *
 * 2026-09-29（深夜·续）客户形态再收两处（店主实机截图口径）：
 *  ① 每轮动作行的「本轮用量」胶囊（dsh-client-ui-chat TurnUsagePanel；图标 + 「用量
 *     N tok」）——动作行只保留 复制 / 点赞 / 点踩 / 在新对话分支 四颗。CSS 首帧遮蔽；
 *     类名 = 官方包构建哈希 `Q51KRG_`，宿主升级需回来对账；
 *  ② 触发候选菜单（+ / 斜杠）里的「模型」命令行（dsh-client-ui-model-selection，
 *     描述「选择本会话使用的模型」）——客户不在此处切模型。DOM 遮蔽按描述指纹
 *     命中（isModelCommandRow，zh/en），菜单每次新开由观察器重放。
 *
 * 2026-09-30 扩展（客户线）：**页面版本跟随（自动刷新）** —— 见文件尾同名分节。
 * 宿主把「全部插件 bundle 的内容修订」内联成 `window.__DSH_BOOT__` 的 rev 进
 * index HTML；客户把站点装到主屏幕后长期不刷新页面，发版（插件/镜像）后旧页面与
 * 服务端新代码混用会出怪状（消息不出回复等）。本机制周期性 no-store 取回文档根、
 * 抽同一 rev 与本地页面比对，不同即自动 `location.reload()` 一次，把旧页面收敛到
 * 新版。仅客户形态安装（开发调试形态保留手动刷新/热重载工作流）。
 *
 * 2026-09-30（店主截图实报）：**文档预览页头「查看器切换」菜单收口**——宿主 TextPreview
 * 工具条的候选渲染器菜单（数据锚 `data-document-viewer-menu`，candidates>1 才渲染），客户
 * 形态不再提供多渲染器选择：切官方「HTML」静态档对脚本页只渲染残缺内容（店主实测「只能
 * 渲染一部分」），「代码 / 纯文本」是开发者视角。统一隐藏该菜单，文件按默认渲染器呈现
 * （.html/.htm = 本插件「交互预览」；回退通道 = 预览页头「下载」按钮）。CSS 首帧 + DOM pass。
 */

/** 逐项遮蔽清单元数据（id 对齐 config.mask.items；守卫测试比对两者）。 */
export const MASK_ITEM_TITLES: Record<MaskItemId, string> = {
  devtools: '轨迹 / 本轮代码差异 / 预设切换（官方 developerTools 门）',
  modelSeat: '模型选择座位',
  seatSettings: '设置入口',
  rowPlugins: '面板行「插件」',
  rowBrowser: '面板行「浏览器」',
  mobileNavFiles: '移动壳「文件浏览」按钮',
  headerPresetChip: '会话头部预设 chip「标准模式」',
  browserDesktop: '「浏览器桌面」入口与自动弹层',
  menuModel: '触发候选菜单「模型」行',
  welcomeDialog: '「内测声明」弹窗',
  openInApp: '「用文件管理器打开」整族',
  twinDesk: '「分身工作台」按钮',
  terminalCard: '「新建终端」入口卡',
  turnUsage: '本轮用量胶囊',
  imSessionRows: 'IM 桥接会话行（dsh-im 通道会话：Matrix · …）',
  menuExtras: '触发候选菜单里「文件 / 目标 / 计划」以外的命令行',
  permissionChip: 'composer 权限胶囊（访问模式）',
  headerMore: '会话头部「更多操作」(⋯) 按钮（下载 Session 日志 / 反馈）',
  bootWordmark: '启动页 vendor 字样（HARNESS / Loading plugins… → 品牌）',
  documentViewerMenu: '文档预览页头「查看器切换」菜单（HTML / 代码 / 纯文本）',
}

/** 需要 DOM pass（含观察器重放）的收口项；全关时整段不安装。 */
const DOM_MASK_IDS: readonly MaskItemId[] = [
  'seatSettings',
  'rowPlugins',
  'rowBrowser',
  'mobileNavFiles',
  'headerPresetChip',
  'browserDesktop',
  'menuModel',
  'welcomeDialog',
  'imSessionRows',
  'menuExtras',
  'permissionChip',
  'headerMore',
  'documentViewerMenu',
]

/** 任一 DOM 收口项启用（总开关 + 单项；全关 = pass 无需安装）。 */
const anyDomMaskEnabled = (): boolean => DOM_MASK_IDS.some((id) => maskEnabled(id))

/** 要隐藏的面板行（aria-label 精确匹配 → 收口项 id；双语兜底）。 */
const PANEL_ROW_ITEMS: ReadonlyMap<string, MaskItemId> = new Map([
  ['插件', 'rowPlugins'],
  ['Plugins', 'rowPlugins'],
  ['浏览器', 'rowBrowser'],
  ['Browser', 'rowBrowser'],
])

const PANEL_ROW_SELECTOR = 'button[class*="panelRow"]'
const SETTINGS_SEAT_SELECTOR = '[data-slot="sidebar.settings"]'

/** 会话头部动作槽（宿主；display:contents，内部 span = 预设 chip「标准模式」）。 */
const HEADER_ACTIONS_SLOT_SELECTOR = '[data-slot="conversation.session.header.actions"]'

// 客户形态额外遮蔽的固定控件（收口项：选择器命中即隐藏）。
// · 移动壳「文件浏览」按钮（右上角文件夹图标；data-mobile-nav 为插件自有稳定标记）
const MOBILE_NAV_FILES_SELECTOR = '[data-mobile-nav="files"]'
// · 预设 chip 标签（见文件头 §扩展②；拼接写法避免模板字符串）
const PRESET_CHIP_SELECTOR = HEADER_ACTIONS_SLOT_SELECTOR + ' > span'

/** 「浏览器桌面」入口按钮/弹层文案指纹（小写包含匹配；zh 为主、en 兜底）。 */
const BROWSER_DESKTOP_HINTS = ['浏览器桌面', 'browser desktop', 'take over'] as const

/** 「浏览器桌面」自动弹层（section[role=dialog]）的文案前缀选择器（zh/en；插件 messages.browserDialog）。 */
const BROWSER_DESKTOP_DIALOG_SELECTOR = [
  'section[role="dialog"][aria-label^="浏览器桌面"]',
  'section[role="dialog"][aria-label^="Browser desktop"]',
].join(', ')

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

/** 触发候选菜单（+ / 斜杠）里可点击的命令行（conversation.input.overlay 槽内 listbox 选项）。 */
const COMMAND_OPTION_SELECTOR = '[data-slot="conversation.input.overlay"] [role="option"]'

/**
 * 触发候选菜单里的**分组标题**（MenuView：`<div role="presentation" data-source="…">指令</div>`）。
 * 它与候选行是**兄弟节点**（宿主不包一层 group 容器），所以行被藏掉后标题会孤单留下 —— 收口时
 * 需要单独判定。选择器只用 `role` + `data-source` 两个稳定锚（类名是宿主构建哈希）。
 */
const COMMAND_GROUP_TITLE_SELECTOR = '[data-slot="conversation.input.overlay"] [role="presentation"][data-source]'

/** 菜单里「模型」命令行的描述指纹（小写包含匹配；zh 为主、en 兜底）。 */
const MODEL_COMMAND_HINTS = ['选择本会话使用的模型', 'select the model for this conversation'] as const

/** 该菜单行是否属于「模型」命令（纯函数，供单测）。 */
export function isModelCommandRow(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  const lowered = text.toLowerCase()
  return MODEL_COMMAND_HINTS.some((hint) => lowered.includes(hint))
}

/**
 * 触发候选菜单里要**保留**的命令行文案（其余命令行一律遮蔽）。
 * 2026-09-30 店主口径：➕ 里只留「文件 / 目标 / 计划」。
 */
// 只收中文名：客户形态固定 zh（实例 settings `locale.preference = zh`）；英文命令名
// （file/goal/plan）是行内附注，且子串匹配会误伤（profile 含 "file"、explain 含 "plan"）。
const MENU_KEEP_HINTS = ['文件', '目标', '计划'] as const

/**
 * 行 id 的来源免收前缀（`optionId()` = `dsh-slash-option-<source>-<index>`）。
 * 技能与 @ 引用是宿主原生能力，不在「命令行收口」范围内。
 */
const MENU_SOURCE_EXEMPT_PREFIXES = ['dsh-slash-option-skill-', 'dsh-slash-option-@'] as const

/** 该候选行是否属于要保留的三项之一（纯函数，供单测）。 */
export function isMenuKeepRow(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  const lowered = text.toLowerCase()
  return MENU_KEEP_HINTS.some((hint) => lowered.includes(hint))
}

/** 该候选行是否来自技能 / 引用来源（免收口；纯函数，供单测）。 */
export function isMenuRowExempt(id: string | null | undefined): boolean {
  if (typeof id !== 'string') return false
  return MENU_SOURCE_EXEMPT_PREFIXES.some((prefix) => id.startsWith(prefix))
}

/**
 * 分组标题是否已成「孤儿」：它名下至少有一行候选、且**全部**被隐藏。
 *
 * 收口菜单命令行后标题会单独留在菜单里（2026-09-30 店主实测：菜单只剩「文件/目标/计划」，
 * 底下却还挂着「指令」两个字）——故整组收完时把标题一并隐藏。
 * @param visibleRows - 该标题名下各候选行的「是否仍可见」。
 * @returns true = 该标题应被隐藏。
 */
export function isOrphanGroupTitle(visibleRows: readonly boolean[]): boolean {
  return visibleRows.length > 0 && visibleRows.every((visible) => !visible)
}

/**
 * 收集某分组标题名下各候选行的可见性（标题与行是兄弟节点，按文档序向后扫到下一个标题为止）。
 * 只读本插件写入的 inline `display`（收口就是它写的），避免每轮 pass 触发 getComputedStyle 布局。
 */
function groupRowVisibility(title: Element): boolean[] {
  const visible: boolean[] = []
  for (let node = title.nextElementSibling; node !== null; node = node.nextElementSibling) {
    if (node.matches(COMMAND_GROUP_TITLE_SELECTOR)) break
    if (node.getAttribute('role') !== 'option') continue
    const inline = node instanceof HTMLElement ? node.style.display : ''
    visible.push(inline !== 'none')
  }
  return visible
}

/** composer 权限胶囊（访问模式）的 aria-label 指纹（zh 为主、en 兜底）。 */
const ACCESS_MODE_HINTS = ['访问模式', 'access mode'] as const

/** 该 aria-label 是否属于权限胶囊（纯函数，供单测）。 */
export function isAccessModeLabel(label: string | null | undefined): boolean {
  if (typeof label !== 'string') return false
  return ACCESS_MODE_HINTS.some((hint) => label.toLowerCase().includes(hint))
}

/** 权限胶囊触发器选择器（zh/en aria-label 前缀；观察器与遮蔽共用）。 */
const ACCESS_MODE_SELECTOR = ['[aria-label^="访问模式"]', '[aria-label^="Access mode"]'].join(', ')

/**
 * 会话头部「更多操作」(⋯) 按钮的 aria-label（宿主 `dsh-session-log-export` 的
 * `header.more`；精确匹配，避免误伤其它「更多」语义的按钮）。
 */
const HEADER_MORE_LABELS = new Set(['更多操作', 'More actions'])

/** 该按钮是否属于会话头部「更多操作」(⋯)（纯函数，供单测）。 */
export function isHeaderMoreLabel(label: string | null | undefined): boolean {
  return typeof label === 'string' && HEADER_MORE_LABELS.has(label.trim())
}

/** 「更多操作」触发器选择器（zh/en aria-label 精确值；观察器与遮蔽共用）。 */
const HEADER_MORE_SELECTOR = ['button[aria-label="更多操作"]', 'button[aria-label="More actions"]'].join(', ')

/**
 * 文档预览页头「查看器切换」菜单触发器（宿主 TextPreview 的候选渲染器菜单；0.1.7-rc.2
 * 实测数据锚恒定 `data-document-viewer-menu`，candidates>1 时才渲染）。
 * 2026-09-30 店主口径：客户形态不做多渲染器选择——统一隐藏。
 */
const DOCUMENT_VIEWER_MENU_SELECTOR = '[data-document-viewer-menu]'

/** 侧栏会话列表行 / 搜索结果行（宿主树组件；桥接会话的标题 span 由 dsh-im 图标插件打位）。 */
const IM_SESSION_ROW_SELECTOR = '[role="treeitem"][aria-selected], button[class*="searchResultRow"]'

/**
 * IM 桥接会话的标题前缀族（与 @xmanrui/dsh-im 的 SESSION_CHANNEL_LABELS 对齐；标题形态
 * =「<标签> · <标题>」）。客户形态不在工作台露出这些会话行——2026-09-30 店主口径：
 * 聊天在 Element/IM 侧进行，工作台列表里再出现一条「Matrix · …」= 多余显示。
 */
const IM_SESSION_TITLE_PREFIXES = [
  'Matrix · ',
  '微信 · ',
  '飞书 · ',
  '钉钉 · ',
  '企业微信 · ',
  'QQ · ',
  'Slack · ',
  'Telegram · ',
  'Discord · ',
  'WhatsApp · ',
  'iMessage · ',
  'AI Office · ',
] as const

/** 该标题是否属于 IM 桥接会话（纯函数，供单测）：精确前缀 + 前缀后必须有非空标题。 */
export function isImSessionTitle(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  return IM_SESSION_TITLE_PREFIXES.some(
    (prefix) => text.startsWith(prefix) && text.slice(prefix.length).trim() !== '',
  )
}

/** 该行是否 IM 桥接会话：dsh-im 图标插件的 marker 优先，标题前缀兜底（marker 异步晚到）。 */
function isImSessionRow(row: Element): boolean {
  if (row.querySelector('[data-dsh-im-session-channel]') !== null) return true
  return isImSessionTitle((row.textContent ?? '').trim())
}

/**
 * 客户形态「首帧隐形」样式（模块求值即注入——早于设置壳渲染，弹窗从未被绘制过，
 * 不是「渲染后再隐藏」）。`body > div:not(#root)` 限定在门户出去的门层，防误伤 App 根。
 * 按收口项组织：总开关/逐项任一关 → 对应规则不注入（开关关掉就没有首帧隐形的介入）。
 */
const CSS_RULES_BY_ITEM: Partial<Record<MaskItemId, readonly string[]>> = {
  // 「内测声明」弹窗门层（DOM pass 之外的 :has 兜底；见文件头 §扩展④）。
  welcomeDialog: [
    'body > div:not(#root):has([role="dialog"][aria-label="内测声明"]) { display: none !important; }',
    'body > div:not(#root):has([role="dialog"][aria-label="Internal Testing Notice"]) { display: none !important; }',
  ],
  // 「浏览器桌面」**自动弹层**（2026-09-30 追补；见文件头 §扩展③ 追补段）。agent 调
  // `browser_open` → 前端轮询自动弹层，无需用户操作；客户公网无 6080 通路、浮层必失败。
  // 首帧即隐形：元素一创建就命中（display:none 覆盖插件内联 display:flex），零闪现；
  // DOM pass 再按同指纹收按钮 + 弹层，双保险。
  browserDesktop: [
    'section[role="dialog"][aria-label^="浏览器桌面"] { display: none !important; }',
    'section[role="dialog"][aria-label^="Browser desktop"] { display: none !important; }',
  ],
  // ui-open-in-app 的整族「在本机打开」控件（标记 `data-open-target`；取值：file =
  // 预览页头/交付卡片，directory = 会话头部「用文件管理器打开」）：容器形态里没有
  // 可用的本机文件管理器，整族都是死按钮（2026-09-29 店主实机「点了也没有用」；
  // 2026-09-30 由 file 单值扩为整族）。首帧即隐形；后续新节点天然命中，无需观察器。
  openInApp: ['[data-open-target] { display: none !important; }'],
  // 会话头部「分身工作台」按钮（dsh-matrix-agent 客户端入口；aria-label 前缀恒定，
  // 待批角标只加后缀）。客户实例上数据链路不可用，是空壳入口——2026-09-30 店主口径。
  twinDesk: ['button[aria-label^="分身工作台"] { display: none !important; }'],
  // 右侧栏「开始」页「新建终端」入口卡（官方 ui-sidebar-terminal 引导卡标记）。
  // 客户形态只保留「工作区文件」卡——2026-09-30 店主口径。
  terminalCard: ['[data-sidebar-right-guide-entry="terminal"] { display: none !important; }'],
  // 每轮动作行的「本轮用量」胶囊（官方 ui-chat TurnUsagePanel；类名 = 官方包构建哈希，
  // 与 0.1.7-rc.2 对账）：客户形态隐藏，动作行只保留 复制/点赞/点踩/分支 四颗。
  turnUsage: ['[class*="Q51KRG_root"] { display: none !important; }'],
  // IM 桥接会话行（marker = dsh-im 图标插件打的稳定位）：CSS 管「已打位」的行——重渲染
  // 命中即隐形、零闪烁；未打位的首帧 / 无图标环境由 DOM pass 的标题前缀兜底。
  imSessionRows: [
    '[role="treeitem"]:has([data-dsh-im-session-channel]) { display: none !important; }',
    'button[class*="searchResultRow"]:has([data-dsh-im-session-channel]) { display: none !important; }',
  ],
  // 启动页（宿主 BootPage，`[data-dsh-boot]`）的 vendor 字样：wordmark `HARNESS` 与提示
  // `Loading plugins…` 一律不显示，改显品牌。规则与宿主半区的首帧注入（compress.ts 的 shell-branding 段
  // 的 BOOT_BRAND_STYLE）必须逐条一致——守卫测试对账两处。这里只管插件加载后的兜底；
  // 首帧（含下拉刷新重放的启动画）由 HTML 出口注入的同一套规则保证。
  bootWordmark: [
    '[data-dsh-boot] [class*="_wordmark_"] { font-size: 0 !important; }',
    '[data-dsh-boot] [class*="_wordmark_"]::after { content: "拾贝智能体"; font-size: 16px; font-weight: 600; letter-spacing: .08em; }',
    '[data-dsh-boot] [class*="_hint_"] { font-size: 0 !important; }',
    '[data-dsh-boot] [class*="_hint_"]::after { content: "正在加载…"; font-size: 12px; }',
  ],
  // 文档预览页头「查看器切换」菜单触发器（宿主 TextPreview 的候选渲染器菜单；数据锚恒定，
  // 见文件头同节）：切「HTML」静态档对脚本页只渲染残缺内容 → 客户形态不做多渲染器选择。
  documentViewerMenu: ['[data-document-viewer-menu] { display: none !important; }'],
}

/** 启用项拼出的首帧样式（空串 = 不注入任何样式；总开关关 = 全空）。 */
function buildStealthCss(): string {
  const rules: string[] = []
  for (const [id, list] of Object.entries(CSS_RULES_BY_ITEM) as [MaskItemId, readonly string[]][]) {
    if (maskEnabled(id)) rules.push(...list)
  }
  return rules.join('\n')
}

if (typeof document !== 'undefined') {
  const STEALTH_TAG_ID = 'dsh-web-mobile/customer-stealth'
  const stealthCss = buildStealthCss()
  if (stealthCss !== '' && document.querySelector('style[data-plugin-css="' + STEALTH_TAG_ID + '"]') === null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-web-mobile'
    tag.dataset.pluginCss = STEALTH_TAG_ID
    tag.textContent = stealthCss
    document.head.appendChild(tag)
  }
}

/** 观察器触发用：任一客户形态遮蔽目标的选择器合集（含未启用项——多余触发无害）。 */
const CUSTOMER_TARGET_SELECTOR = [
  SETTINGS_SEAT_SELECTOR,
  PANEL_ROW_SELECTOR,
  MOBILE_NAV_FILES_SELECTOR,
  PRESET_CHIP_SELECTOR,
  '[aria-label*="浏览器桌面"]',
  BROWSER_DESKTOP_DIALOG_SELECTOR,
  COMMAND_OPTION_SELECTOR,
  COMMAND_GROUP_TITLE_SELECTOR,
  WELCOME_DIALOG_SELECTOR,
  IM_SESSION_ROW_SELECTOR,
  ACCESS_MODE_SELECTOR,
  HEADER_MORE_SELECTOR,
  DOCUMENT_VIEWER_MENU_SELECTOR,
].join(', ')

/** 面板行 → 收口项 id（纯函数，供单测；非收口行返回 null）。 */
export function panelRowMaskId(label: string | null | undefined): MaskItemId | null {
  if (typeof label !== 'string') return null
  return PANEL_ROW_ITEMS.get(label.trim()) ?? null
}

/**
 * 对 root 做一遍客户形态遮蔽（按 config.mask 逐项过滤：设置入口 + 面板行 +
 * 文件浏览按钮 / 预设 chip / 浏览器桌面入口 / 触发候选菜单「模型」行 / 内测声明弹窗）。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export function applyCustomerMode(root: ParentNode): boolean {
  let changed = false
  const hideElement = (element: Element): void => {
    if (element instanceof HTMLElement && element.style.display !== 'none') {
      element.style.display = 'none'
      changed = true
    }
  }
  const hideAll = (selector: string): void => {
    for (const element of root.querySelectorAll(selector)) hideElement(element)
  }

  if (maskEnabled('seatSettings')) hideAll(SETTINGS_SEAT_SELECTOR)
  for (const row of root.querySelectorAll(PANEL_ROW_SELECTOR)) {
    const id = panelRowMaskId(row.getAttribute('aria-label'))
    if (id === null || !maskEnabled(id)) continue
    hideElement(row)
  }
  if (maskEnabled('mobileNavFiles')) hideAll(MOBILE_NAV_FILES_SELECTOR)
  if (maskEnabled('headerPresetChip')) hideAll(PRESET_CHIP_SELECTOR)
  if (maskEnabled('browserDesktop')) {
    // 侧栏入口按钮 + 自动弹层（section[role=dialog]；browser_open 触发即弹、无用户操作）。
    // CSS 首帧规则已兜住弹层隐形，这里按同一指纹重复确认，兼容 CSS 未生效的场景。
    for (const element of root.querySelectorAll('button[aria-label], ' + BROWSER_DESKTOP_DIALOG_SELECTOR)) {
      if (!isBrowserDesktopLabel(element.getAttribute('aria-label'))) continue
      hideElement(element)
    }
  }
  if (maskEnabled('menuModel')) {
    for (const option of root.querySelectorAll(COMMAND_OPTION_SELECTOR)) {
      if (!isModelCommandRow(option.textContent)) continue
      hideElement(option)
    }
  }
  if (maskEnabled('menuExtras')) {
    for (const option of root.querySelectorAll(COMMAND_OPTION_SELECTOR)) {
      if (isMenuRowExempt(option.id)) continue
      if (isMenuKeepRow(option.textContent)) continue
      hideElement(option)
    }
    // 行收完后再判定标题：整组命令行都被收掉 → 标题会成孤儿，一并隐藏（同上截图）。
    for (const title of root.querySelectorAll(COMMAND_GROUP_TITLE_SELECTOR)) {
      if (isOrphanGroupTitle(groupRowVisibility(title))) hideElement(title)
    }
  }
  if (maskEnabled('permissionChip')) {
    for (const button of root.querySelectorAll(ACCESS_MODE_SELECTOR)) hideElement(button)
  }
  if (maskEnabled('headerMore')) {
    for (const button of root.querySelectorAll(HEADER_MORE_SELECTOR)) hideElement(button)
  }
  if (maskEnabled('documentViewerMenu')) {
    // 预览页头查看器切换菜单（0.1.7-rc.2 数据锚；该菜单打开态在 portal，隐藏触发器即
    // 无法再打开；CSS 首帧规则已覆盖新建节点，这里兜 CSS 未生效的场景）。
    hideAll(DOCUMENT_VIEWER_MENU_SELECTOR)
  }
  if (maskEnabled('imSessionRows')) {
    for (const row of root.querySelectorAll(IM_SESSION_ROW_SELECTOR)) {
      if (isImSessionRow(row)) hideElement(row)
    }
  }
  if (maskEnabled('welcomeDialog')) {
    for (const dialog of root.querySelectorAll(WELCOME_DIALOG_SELECTOR)) {
      if (!isWelcomeNoticeLabel(dialog.getAttribute('aria-label'))) continue
      // ① 遮父 overlay（含 backdrop mask）：首帧隐形主靠模块级 CSS；这里兜非 :has 环境。
      const overlay = dialog.parentElement instanceof HTMLElement ? dialog.parentElement : dialog
      hideElement(overlay)
      // ② 摘掉应用根的 inert：未确认期间宿主把 #root 置 inert，真实触摸会被整个吞掉
      //    （程序化 click() 不受 inert 限制——曾据此误判「无阻塞」，实际用户点不动）。
      const appRoot = document.getElementById('root')
      if (appRoot !== null && appRoot.hasAttribute('inert')) {
        appRoot.removeAttribute('inert')
        changed = true
      }
      // ③ 不代点「继续」：店主口径 = 用户看不到这个窗口即可，不触发宿主确认动作。
    }
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
  // 1) 官方门同步（devtools 项）：等镜像就绪（本地 RPC，很快）再对账写入，避免加载竞态下误判。
  ctx.inject(['configForms'], (scope) => {
    const face = (scope as unknown as { configForms?: ConfigFormsFace }).configForms?.developerTools
    if (face === undefined) return
    // 遮蔽生效 → 官方门关；总开关关/单项回开 → 门开（同原 devMode 双态语义）。
    const target = !maskEnabled('devtools')
    const timer = setTimeout(() => {
      if (face.enabled.getSnapshot() === target) return
      face.setEnabled(target).catch((error: unknown) => {
        console.warn('[dsh-web-mobile] developerTools 同步失败（不影响聊天）', error)
      })
    }, 800)
    return () => clearTimeout(timer)
  })

  // 2) DOM 遮蔽（仅客户形态、按 mask 逐项过滤）：设置入口 + 浏览器/插件面板行 +
  //    文件浏览按钮 / 预设 chip / 浏览器桌面入口 / 菜单「模型」行 / 内测声明弹窗。
  ctx.effect(() => {
    if (!anyDomMaskEnabled()) return () => {}
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

// ═══════════════ 客户形态 · 页面版本跟随（自动刷新，2026-09-30）═══════════════
//
// 背景（店主）：客户把站点装到主屏幕（PWA）后长期不刷新页面；发版（插件/镜像）后
// 旧页面与服务端新代码混用会出各种怪状（消息不出回复等），而 PWA 的「恢复」语义
// （切出去再回来不重新导航）让一个旧页面可以存活数天。本效果 = 周期性对比「本地
// 页面启动时的版本」与「服务端当前版本」，不一致就自动刷新一次取新版。
//
// 版本指纹选 `window.__DSH_BOOT__` 的 `rev`（宿主 client-modules 的启动图哈希：
// 对每个插件 bundle 的内容修订取 sha1，同时随镜像重建而变化）。两端对称：
//   · 本地 = 运行时全局 `__DSH_BOOT__`（宿主在 index HTML 内联、boot 时读取）；
//   · 服务端 = no-store fetch 文档根（`<base href="./">` 解析出的 app 根），从返回
//     HTML 文本里再抽同一个内联全局（`globalThis["__DSH_BOOT__"] = {…}`）。
// 选 rev 而不是 DOM 清单：JSON 形态、两端同源、不受懒加载往 DOM 追加 preload/script
// 的干扰。两个字符串不同 ⇒ 服务端代码集已变 ⇒ `location.reload()`。
//
// 保守约束（防误刷 / 防刷新循环）：
//   · 只在页面可见时轮询（60s）；回到前台（visibilitychange / pageshow）、网络恢复
//     （online）时补查，两次检查最小间隔 15s；
//   · 焦点在输入类控件（正在打字）时不刷、20s 后重试（草稿本身跨刷新持久——宿主
//     contract：composer draft "survives session switches and reloads"；这里只是
//     不打断正在进行的输入动作）；
//   · 同一目标版本最多自动刷 2 次（sessionStorage 记账，跨刷新保留）：刷完仍旧版
//     （缓存异常/服务端回滚竞态）就放弃该目标，不再循环；
//   · 任一侧拿不到 rev（旧宿主、登录页、网络失败、非 http(s)）一律静默跳过。
// 边界：登录页与营销页由门户渲染、没有该全局 → 天然不参与；本效果随插件走
// （门户 / NodePort / DSHA 壳里的页面均生效，与视口无关）。

/** 检查间隔（页面可见时轮询）；隐藏期间不发请求。 */
const AUTO_RELOAD_INTERVAL_MS = 60_000
/** 两次检查的最小间隔（事件触发的补查沿用）。 */
const AUTO_RELOAD_MIN_GAP_MS = 15_000
/** 页面加载后首次检查的延迟（避开启动期）。 */
const AUTO_RELOAD_FIRST_DELAY_MS = 15_000
/** 因「正在输入」推迟后的重试延迟。 */
const AUTO_RELOAD_DEFER_RETRY_MS = 20_000
/** 单次检查的取件超时。 */
const AUTO_RELOAD_FETCH_TIMEOUT_MS = 10_000
/** 同一目标版本最多自动刷新的次数（防刷新循环）。 */
export const AUTO_RELOAD_MAX_PER_TARGET = 2
/** 记账键（sessionStorage：跨刷新保留、随标签页生灭）。 */
export const AUTO_RELOAD_STORAGE_KEY = 'dsh-web-mobile:auto-reload'

/** 自动刷新记账：目标版本（服务端启动图 rev）与已尝试的刷新次数。 */
export interface AutoReloadState {
  target: string
  attempts: number
}

/**
 * 读一个 `__DSH_BOOT__` 候选值的启动图 rev。形态不符（旧宿主/异常页）返回 null。
 * @param value - 任意 `__DSH_BOOT__` 候选值。
 * @returns rev 字符串，或 null。
 */
export function bootRevOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const rev = (value as { rev?: unknown }).rev
  return typeof rev === 'string' && rev !== '' ? rev : null
}

/**
 * 从宿主渲染的 index HTML 文本里抽启动图 rev（内联行
 * `globalThis["__DSH_BOOT__"] = {…}`；宿主对 JSON 值做过 `\u003c` 转义，不含裸
 * `</script`）。抽不到（旧宿主格式/登录页/中间层改写）返回 null，调用方静默跳过。
 * @param html - index 响应文本。
 * @returns rev 字符串，或 null。
 */
export function bootRevInHtml(html: string): string | null {
  const match = /globalThis\["__DSH_BOOT__"\]\s*=\s*([\s\S]+?)\s*<\/script>/.exec(html)
  if (match === null) return null
  try {
    return bootRevOf(JSON.parse(match[1] ?? '') as unknown)
  } catch {
    // 非法 JSON（页面被中间层改写等）→ 当抽不到，静默跳过
    return null
  }
}

/**
 * 该目标版本是否还允许自动刷新（同目标已刷满上限则放弃）。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则允许）。
 * @returns 是否允许刷新。
 */
export function autoReloadAllowed(fresh: string, state: AutoReloadState | null): boolean {
  if (state === null) return true
  return !(state.target === fresh && state.attempts >= AUTO_RELOAD_MAX_PER_TARGET)
}

/**
 * 记一次「即将发生」的刷新：换目标从 1 起算，同目标累加。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则新建）。
 * @returns 新记账状态。
 */
export function autoReloadNextState(fresh: string, state: AutoReloadState | null): AutoReloadState {
  const attempts = state !== null && state.target === fresh ? state.attempts + 1 : 1
  return { target: fresh, attempts }
}

/** 焦点是否在输入类控件上（正在打字，刷新应推迟而不是打断）。 */
export function isEditableFocused(doc: Document): boolean {
  const active = doc.activeElement
  if (active === null) return false
  const tag = active.tagName
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return true
  return active instanceof HTMLElement && active.isContentEditable
}

/** 读记账（无/坏值都当空；sessionStorage 在隐私模式下也可能不可用）。 */
function readAutoReloadState(): AutoReloadState | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(AUTO_RELOAD_STORAGE_KEY)
  } catch {
    // sessionStorage 不可用（隐私模式等）→ 视作无记账
    return null
  }
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { target, attempts } = parsed as { target?: unknown; attempts?: unknown }
    if (typeof target !== 'string' || typeof attempts !== 'number' || !Number.isFinite(attempts)) return null
    return { target, attempts }
  } catch {
    // 坏 JSON（外部改写）→ 视作无记账
    return null
  }
}

/** 写记账（写失败不阻断刷新本身）。 */
function writeAutoReloadState(state: AutoReloadState): void {
  try {
    sessionStorage.setItem(AUTO_RELOAD_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage 写失败（隐私模式/配额）→ 放弃记账
  }
}

/** no-store 取文档根并抽服务端 rev；任何失败静默返回 null。 */
async function fetchServerBootRev(base: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, AUTO_RELOAD_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(base, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { accept: 'text/html' },
    })
    if (!response.ok) return null
    return bootRevInHtml(await response.text())
  } catch {
    // 网络失败/超时 → 静默跳过，下一轮再试
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 安装页面版本跟随（自动刷新；全视口生效——桌面标签页同样会挂着旧版本）。
 * @param ctx - client 根上下文。
 */
export function installAutoReload(ctx: ClientContext): void {
  if (!config.mask.master) return
  ctx.effect(() => {
    const base = document.baseURI
    if (!/^https?:/.test(base)) return () => {}
    if (bootRevOf((globalThis as { __DSH_BOOT__?: unknown }).__DSH_BOOT__) === null) return () => {}
    let lastCheckAt = 0
    let inFlight = false
    let disposed = false
    let deferTimer: ReturnType<typeof setTimeout> | undefined
    // 武装标记（诊断/探针用：确认效果真的装上了——「静默惰性」的分支很难从外部区分）。
    document.documentElement.setAttribute('data-mobile-nav-auto-reload', 'armed')

    async function check(): Promise<void> {
      if (disposed || inFlight) return
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastCheckAt < AUTO_RELOAD_MIN_GAP_MS) return
      lastCheckAt = now
      if (navigator.onLine === false) return
      if (isEditableFocused(document)) {
        // 正在打字：不打断，稍后重试（草稿跨刷新持久，这里只是不抢输入动作）。
        scheduleDeferred()
        return
      }
      inFlight = true
      let fresh: string | null = null
      try {
        fresh = await fetchServerBootRev(base)
      } finally {
        inFlight = false
      }
      if (disposed || fresh === null) return
      const liveRev = bootRevOf((globalThis as { __DSH_BOOT__?: unknown }).__DSH_BOOT__)
      if (liveRev === null || fresh === liveRev) return
      const state = readAutoReloadState()
      if (!autoReloadAllowed(fresh, state)) return
      const next = autoReloadNextState(fresh, state)
      writeAutoReloadState(next)
      console.info('[dsh-web-mobile] 服务端版本已更新，自动刷新页面', {
        from: liveRev,
        to: fresh,
        attempt: next.attempts,
      })
      location.reload()
    }

    const scheduleDeferred = (): void => {
      if (disposed || deferTimer !== undefined) return
      deferTimer = setTimeout(() => {
        deferTimer = undefined
        void check()
      }, AUTO_RELOAD_DEFER_RETRY_MS)
    }

    const interval = setInterval(() => { void check() }, AUTO_RELOAD_INTERVAL_MS)
    const firstCheck = setTimeout(() => { void check() }, AUTO_RELOAD_FIRST_DELAY_MS)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void check()
    }
    const onPageShow = (): void => { void check() }
    const onOnline = (): void => { void check() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', onOnline)
    return () => {
      disposed = true
      clearInterval(interval)
      clearTimeout(firstCheck)
      if (deferTimer !== undefined) clearTimeout(deferTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', onOnline)
      document.documentElement.removeAttribute('data-mobile-nav-auto-reload')
    }
  }, 'dsh-web-mobile: auto reload')
}
