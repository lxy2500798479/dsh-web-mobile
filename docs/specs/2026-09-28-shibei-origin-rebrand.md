---
kind: design
status: active
date: 2026-09-28
---

# 拾贝起源换牌（Logo / 首屏标语 / 侧栏品牌名 / 浏览器标题）

## 目标

把面向客户部署（拾贝起源）的 DSH Web UI 上的 DeepSeek Harness 标识换成自有品牌：

- 品牌图形 → `https://maas-test.10rig.com/static/image/shibei-origin-logo.036e3d268e.png`
- 品牌文案 → `拾贝起源点智成金`（首屏标语与侧栏品牌名共用）

不做移动断点门控：品牌应与视口无关地一致（桌面端、手机端、PWA 同貌）。

## 机制（为什么这么做）

宿主（dsh 官方）对品牌留了两个口子，我们各占其一：

### 1. 品牌图形与侧栏名 —— 占据官方品牌 slot

官方三个品牌位是**为替换而设计**的（`dsh-client-ui-brand-official` README「替换品牌」
节原文：*自有身份的部署不组合本包，而是组合另一个占据侧栏 slot——以及本包留给回退的
首屏 slot——的包。占据 slot 是唯一的组合路径；这里不存在任何品牌配置面*）：

| slot | 宿主回退 | 我们的占据实现 |
|---|---|---|
| `conversation.hero.brand.mark` | 动画鱼（首屏） | `HeroBrandMark`（`size: 34`） |
| `sidebar.brand.mark` | 鱼形（侧栏展开行 + 折叠轨道） | `SidebarBrandMark`（`size: 24`） |
| `sidebar.brand.name` | 「本地构建」标签 | `SidebarBrandName`（品牌文案） |

非官方构建下 brand-official 自身不注册（注册受构建 profile 门控），所以双方不会在
同优先级上撞车（single slot：同键同优先级二次注册会抛错）。

> **实机修正（2026-09-28 本地实测）**：`official` 构建档下 brand-official **会**实际
> 注册侧栏两个品牌位（本地宿主页面里就是官方鱼形 + wordmark）；单槽位同优先级二次注册
> 直接抛错，注册失败后该位子仍归官方。因此本插件三处品牌位注册统一带
> `priority: -1` —— 明确遮蔽官方项（slots 运行时语义：lowest renders；无竞争者时
> 照常渲染）。首屏位官方不注册（留给回退鱼），但同样用 -1 防第三方抢占时同优先级炸。

### 2. 首屏标语与「预览版」徽标 —— DOM 替换（官方未留 slot）

`hero.headline`（「探索未至之境」）与 `hero.preview`（「预览版」徽标）都硬写在
`conversation` 命名空间字典里，不是 slot；`dsh-client-locale` 的 `register` 对同命名
空间同 locale 的重复注册直接抛 `already has locale`——字典被宿主包独占，覆盖不进去。
因此两者走同一个 DOM pass（`effects/brand-headline.ts`）：

- 替换范围：`[class*="titleGroup"]` 下的直接子 span，标语按文本**精确**匹配宿主原文
  （zh `探索未至之境` / en `Into the Unknown`）；徽标按 class 本地名 `previewBadge`
  （首选锚点）或文本精确等于 `预览版` / `Preview`（跨代兜底）直接移除。聊天内容里
  出现同样文字不会被误伤（内容不在 titleGroup 内），处理幂等。
- 生命周期：React 之后不会回写这些节点（`t()` 输出恒定，diff 无变化），原文/徽标只在
  整块重挂时回来；观察器仅对「新增子树」与「titleGroup 内的变化」做脏标记，
  命中才整树处理一遍——聊天流式输出的高频 childList 不触发整树扫描。
- 失败模式：宿主未来若改名 `titleGroup` 类本地名，处理静默失效（回退为显示宿主原文
  与徽标，无破坏）；`core/brand.ts` 的判据是唯一事实源，改文案/改移除清单只需改一处。

### 3. 浏览器标签标题 —— 客户端覆盖（2026-09-29）

宿主标题是**构建环境的事**：`DSH_CLIENT_TITLE` 在发布构建时烘焙进客户端包
（dsh-client-ui-brand-official README 原文「浏览器标题独立——…而非通过 UI slot」），
运行时由 ui-layout 的 DocumentTitle 持续写入 `document.title`（裸产品名，或
「`<会话名> — <产品名>`」；会话切换与流式标题更新都会重写）。没有 slot、没有运行时
可配置面 ⇒ 与首屏标语同路：`effects/brand-title.ts` 观察 `<title>` 子树，把宿主的
「DeepSeek Harness」替换为 `SHIBEI_BRAND_NAME`（保留「会话名 — 」前缀；幂等，
写入自身不回环）。

> 备选方案记录：曾以 nginx `sub_filter` 在部署层替换（一次性、无需插件在场），
> 2026-09-29 按用户口径回退——品牌/业务逻辑不放网关写死，归项目（本插件）。
> 同一口径下 wm 站点的 favicon / PWA 图标走部署层**静态资产**替换（非代码）。

### 4. 浏览器标签图标（favicon）—— 客户端覆盖（2026-09-29）

宿主 shell HTML 写死两个 SVG favicon（`<link rel="icon" type="image/svg+xml"
href="./favicon-dark.svg" media="(prefers-color-scheme: dark)">` + 亮色变体），
没有 slot 也没有运行时配置面 ⇒ 与标题同路，由 `effects/brand-title.ts` 的
`installBrandFavicon`（与标题同模块 —— 同属浏览器标签品牌、同一 DOM 覆盖机制）在客户端
把 `rel` 含 `icon` 的 link 重指到 `SHIBEI_LOGO_URL`（PNG），并同步把 `type` 从
`image/svg+xml` 修正为 `image/png`（不改 type 的话浏览器可能因 SVG 声明跳过该
link）。挂载全量一遍 + 观察 `<head>` 子树新增（宿主整块重挂时补一次）；幂等、
写入不回环；不做视口门控。

> 边界：`apple-touch-icon` 不在射程（单词匹配不命中；且 iOS 桌面图标在「添加到
> 主屏幕」时快照，运行时改不了）；PWA 安装名/`manifest.webmanifest` 是浏览器直接
> 拉取的静态文件 —— 二者属部署层。**验证**：实例 HTML 原始 title 仍为宿主字样
> （构建烘焙），运行时由本效果与 `brand-title` 覆盖。

## 文件地图

| 文件 | 职责 |
|---|---|
| `src/client/core/brand.ts` | 常量（URL / 文案 / 宿主原文清单）+ 判据 `isHostHeroHeadline`（零 DOM，可单测） |
| `src/client/components/ShibeiBrand.tsx` | 三个占位组件（首屏 mark / 侧栏 mark / 侧栏名） |
| `src/client/effects/brand-headline.ts` | 首屏标语 DOM 替换（挂载全量 + 增量观察） |
| `src/client/effects/brand-title.ts` | 浏览器标签品牌 DOM 覆盖（标题：观察 `<title>`；图标：观察 `<head>` 重指品牌 logo + 修正 type；2026-09-29） |
| `src/client/index.tsx` | 三处品牌位 `slots.inject` + `installBrandHeadline(ctx)` + `installBrandTitle(ctx)` + `installBrandFavicon(ctx)` + `installDeploymentMode(ctx)` + 模型座位遮蔽注册（devMode=false 时） |
| `src/client/config.ts` | 部署形态开关 `devMode`（客户态 / 开发态） |
| `src/client/components/ModelSeatHidden.tsx` | 模型座位遮蔽组件（渲染 null） |
| `src/client/effects/deployment-mode.ts` | developerTools 同步 + 设置/浏览器/插件面板行遮蔽 |

## 边界与遗留

- **浏览器标签标题已纳入（2026-09-29 续改）**：宿主标题是 `DSH_CLIENT_TITLE` 构建
  烘焙、运行时不读环境变量 ⇒ 由 `effects/brand-title.ts` 做 `<title>` 观察替换
  （见上节）。曾用的 nginx `sub_filter` 部署层方案已按用户口径回退。
- **favicon 已纳入（2026-09-29 续改）**：实例 shell HTML 写死两个 SVG link ⇒ 由
  `effects/brand-favicon.ts` 客户端重指品牌 logo（见上节）。`apple-touch-icon`
  与 PWA 安装名（`manifest.webmanifest`）不在插件射程 —— 属部署层静态资产
  （wm 站点已换拾贝 logo，存档 `deepseek-harness-docker/deploy/nginx/dsh-pwa/`）。
- **资产可达性**：logo 从 `maas-test.10rig.com` 运行时加载（带内容哈希，可长缓存）。
  客户侧若无该域名可达性，需要把资源换到公共入口或内联进包（改 `SHIBEI_LOGO_URL`
  一处即可）。
- 首屏「预览版」徽标：**已移除**（2026-09-28 续改；与标语同一 DOM pass；判据见 `core/brand.ts`
  的 `HOST_PREVIEW_BADGES` / `isHostPreviewBadgeText`，宿主改名时静默降级）。

## 部署形态开关（`config.ts` 的 `devMode`，2026-09-28 续改）

> 2026-09-29 开关化：`devMode` 退役，语义并入 `config.mask.master`（+ 逐项 `mask.items`
> 14 项，每项一配置）——见 `docs/specs/2026-09-29-customer-mask-config-design.md`；
> 本节表格为 2026-09-28 历史形态，保留作沿革记录。

面向客户的生产形态把「开发/高级入口」全收起来，开发调试时开回来。一个开关、一处配置：

| devMode | 行为 |
|---|---|
| `false`（默认） | 轨迹 / 本轮代码差异 / 预设切换 → 走宿主官方 `ui-settings.developerTools` 门（启动后同步为 false，官方各自渲染器自行隐藏）；设置 / 浏览器 / 插件 面板行（DOM 按 aria-label 命中）与模型选择座位（slot 遮蔽）→ 本插件直接收 |
| `true` | 以上全部恢复显示（官方门同步为 true） |

- **为什么走官方门**：宿主 0.1.7 线自带 `developerTools` 偏好（默认 **true**，官方原文
  "New installations and missing values enable the full interface"），轨迹/代码差异/预设
  三种入口都由它门控——不重复造轮子，只把它同步成我们的值。旧宿主（rc.6 线）没有
  `configForms` 服务 → inject 不触发，整段惰性、不报错。
- **失败模式**：DOM 行未命中 → 静默（多显示一个入口，无破坏）；设置项写入失败 → console.warn，
  不影响聊天。
- **实机验证（2026-09-28 本地 3080）**：`devMode=false` → 设置行隐藏 ✓ / 插件行隐藏 ✓ /
  预设座位渲染为空 ✓ / 模型座位空 ✓；改 `true` 重建 → 四项全部恢复（预设 chip「标准模式」、
  模型选择内容 4305 字节）✓；翻回 false 定版。
- **文件**：`src/client/config.ts`（开关）、`src/client/effects/deployment-mode.ts`（同步+遮蔽）、
  `src/client/components/ModelSeatHidden.tsx`（座位遮蔽组件）。

## 模型座位遮蔽（单模型固定部署）

部署只有一个内置模型（qwen3.6-35b-a3b），前端不再给用户选：`conversation.input.model` 是宿主
single 槽（model-selection 插件注册在优先级 0）→ 本插件以 `priority: -1` 遮蔽并渲染 `null`。
rc.6 基线已有该槽的 slot 声明（零增补类型）；旧宿主无此槽时静默惰性。**devMode=true 时不注册**，
开发态照常可切模型调试。
