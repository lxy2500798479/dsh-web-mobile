// 品牌改造回归（2026-09-28 起；文案 2026-09-30 晚定为「中贝智能体」，图形为「中贝」那套）：
// 常量形状、首屏标语判据（精确匹配、不误伤聊天内容），以及 index.tsx 里三个品牌位
// 注册的存在性（源码级守卫——slot 名拼错的失败模式是静默回退到官方鱼标）。
// 2026-09-29 追加：客户形态控件遮蔽守卫（deployment-mode 的「浏览器桌面」指纹 +
// 文件浏览按钮 / 预设 chip 选择器；新测试文件受 AGENTS.md 文件数契约约束，故并入）。
// 2026-09-29 再追加：账号行/退出登录守卫（account-card 纯函数 + 注册与
// 「刻意跨宽度」源码级守卫；同样并入）。
// 2026-09-30 再追加：页面版本跟随（auto-reload）防回归——rev 抽取纯函数、记账上限
// 判据与源码级约束（no-store / 可见性门 / 输入中推迟 / 刷新落在记账门之后；并入）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HOST_HERO_HEADLINES,
  HOST_PREVIEW_BADGES,
  HOST_PRODUCT_TITLE,
  SHIBEI_BRAND_NAME,
  SHIBEI_LOGO_URL,
  applyBrandTitle,
  isHostHeroHeadline,
  isHostPreviewBadgeText,
} from '../src/client/core/brand.ts'
import {
  AUTO_RELOAD_MAX_PER_TARGET,
  MASK_ITEM_TITLES,
  autoReloadAllowed,
  autoReloadNextState,
  bootRevInHtml,
  bootRevOf,
  isBrowserDesktopLabel,
  isImSessionTitle,
  isAccessModeLabel,
  isHeaderMoreLabel,
  isMenuKeepRow,
  isOrphanGroupTitle,
  isMenuRowExempt,
  isModelCommandRow,
  isWelcomeNoticeLabel,
  panelRowMaskId,
} from '../src/client/effects/deployment-mode.ts'
import { config, maskEnabled } from '../src/client/config.ts'
import { BOOT_BRAND_RULES } from '../src/compress.ts'
import { SHIBEI_SUPPORT_LINE } from '../src/client/core/brand.ts'
import {
  accountDisplayName,
  accountLocalpart,
  avatarInitial,
  parsePortalAccount,
  validatePasswordForm,
} from '../src/client/components/account-card.ts'
import {
  BUILTIN_HTML_PREVIEW_ID,
  HTML_LIVE_PREVIEW_ID,
  decodeHtmlBytes,
  htmlPreviewDefinition,
  prefersChinese,
} from '../src/client/core/html-preview.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('首屏标语判据：只认宿主原文（zh/en），精确匹配、容忍两侧空白', () => {
  for (const marker of HOST_HERO_HEADLINES) {
    assert.equal(isHostHeroHeadline(marker), true)
    assert.equal(isHostHeroHeadline(`  ${marker}\n`), true)
  }
  assert.equal(isHostHeroHeadline('探索未至之境，顺便聊聊'), false)
  assert.equal(isHostHeroHeadline(SHIBEI_BRAND_NAME), false)
  assert.equal(isHostHeroHeadline(''), false)
  assert.equal(isHostHeroHeadline(null), false)
  assert.equal(isHostHeroHeadline(undefined), false)
})

test('预览徽标判据：只认宿主原文（zh/en），精确匹配、容忍两侧空白', () => {
  for (const marker of HOST_PREVIEW_BADGES) {
    assert.equal(isHostPreviewBadgeText(marker), true)
    assert.equal(isHostPreviewBadgeText(` ${marker} `), true)
  }
  assert.equal(isHostPreviewBadgeText('预览'), false)
  assert.equal(isHostPreviewBadgeText('预览版上线'), false)
  assert.equal(isHostPreviewBadgeText(''), false)
  assert.equal(isHostPreviewBadgeText(null), false)
  assert.equal(isHostPreviewBadgeText(undefined), false)
})

test('品牌常量：文案与 logo URL 形状', () => {
  assert.equal(SHIBEI_BRAND_NAME, '中贝智能体')
  assert.match(
    SHIBEI_LOGO_URL,
    /^https:\/\/wm\.10rig\.com:8443\/brand\/zhongbei-logo\.[0-9a-f]+\.png$/,
  )
})

test('三个品牌位注册在 index.tsx 中存在（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  for (const slot of [
    'conversation.hero.brand.mark',
    'sidebar.brand.mark',
    'sidebar.brand.name',
  ]) {
    assert.ok(
      source.includes(`ctx.slots.inject('${slot}'`),
      `missing brand slot registration: ${slot}`,
    )
  }
})

test('浏览器标题判据：宿主产品名 → 品牌名（裸标题与「会话名 — 产品名」形态）', () => {
  assert.equal(HOST_PRODUCT_TITLE, 'DeepSeek Harness')
  assert.equal(applyBrandTitle(HOST_PRODUCT_TITLE), SHIBEI_BRAND_NAME)
  assert.equal(
    applyBrandTitle(`修复登录 — ${HOST_PRODUCT_TITLE}`),
    `修复登录 — ${SHIBEI_BRAND_NAME}`,
  )
  // 幂等：品牌标题再作用一次不变（观察器写入不回环）
  assert.equal(applyBrandTitle(SHIBEI_BRAND_NAME), SHIBEI_BRAND_NAME)
  assert.equal(applyBrandTitle('别的产品'), '别的产品')
})

test('浏览器标题效果在 index.tsx 中接线（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(source.includes('installBrandTitle(ctx)'), 'missing installBrandTitle(ctx) wiring')
})

test('浏览器标签图标效果在 index.tsx 中接线（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(source.includes('installBrandFavicon(ctx)'), 'missing installBrandFavicon(ctx) wiring')
})

test('favicon 效果：重指品牌 logo 并修正 type（源码级守卫，与标题同模块）', async () => {
  const source = await readFile(join(root, 'src/client/effects/brand-title.ts'), 'utf8')
  assert.ok(source.includes('installBrandFavicon'), 'missing installBrandFavicon')
  assert.ok(source.includes('link[rel~="icon"]'), 'missing link[rel~="icon"] selector')
  assert.ok(source.includes('SHIBEI_LOGO_URL'), 'missing SHIBEI_LOGO_URL usage')
  assert.ok(source.includes("'image/png'"), "missing type correction to 'image/png'")
})

test('浏览器桌面文案指纹：命中 zh/en，普通按钮不误伤（客户形态遮蔽）', () => {
  assert.equal(isBrowserDesktopLabel('打开浏览器桌面并人工接管'), true)
  assert.equal(isBrowserDesktopLabel('Open Browser Desktop and take over'), true)
  assert.equal(isBrowserDesktopLabel('TAKE OVER'), true)
  assert.equal(isBrowserDesktopLabel('打开右侧边栏'), false)
  assert.equal(isBrowserDesktopLabel('文件浏览'), false)
  assert.equal(isBrowserDesktopLabel(''), false)
  assert.equal(isBrowserDesktopLabel(null), false)
  assert.equal(isBrowserDesktopLabel(undefined), false)
})

test('面板行收口判据保持既有契约（文件浏览不误伤）', () => {
  assert.equal(panelRowMaskId('插件'), 'rowPlugins')
  assert.equal(panelRowMaskId('Browser'), 'rowBrowser')
  assert.equal(panelRowMaskId('文件浏览'), null)
  assert.equal(panelRowMaskId(null), null)
})

test('deployment-mode 含三个客户形态额外遮蔽目标（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('[data-mobile-nav="files"]'), 'missing files-button target')
  assert.ok(
    source.includes("HEADER_ACTIONS_SLOT_SELECTOR + ' > span'"),
    'missing preset-chip target',
  )
  assert.ok(source.includes("'浏览器桌面'"), 'missing browser-desktop fingerprint')
  assert.ok(source.includes('isWelcomeNoticeLabel'), 'missing welcome-notice hide')
  assert.ok(source.includes("removeAttribute('inert')"), 'missing inert release')
  assert.ok(source.includes('CSS_RULES_BY_ITEM'), 'missing stealth CSS')
  assert.ok(source.includes(':has([role="dialog"]'), 'missing :has overlay selector')
  assert.ok(!source.includes('button.click()'), 'must NOT auto-click the welcome continue')
})

test('客户形态再遮蔽三处：分身工作台 / 新建终端卡 / 文件管理器打开（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('button[aria-label^="分身工作台"]'), 'missing twin-desk button hide')
  assert.ok(
    source.includes('[data-sidebar-right-guide-entry="terminal"]'),
    'missing terminal guide-card hide',
  )
  assert.ok(
    source.includes('[data-open-target] { display: none !important; }'),
    'missing open-in-app family hide',
  )
})

test('客户形态再收两处：动作行用量胶囊 / 菜单模型行（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('[class*="Q51KRG_root"]'), 'missing turn-usage pill hide')
  assert.ok(source.includes('conversation.input.overlay'), 'missing command-menu scope')
  assert.ok(source.includes('isModelCommandRow'), 'missing model-row hide')
})

test('菜单「模型」行指纹：命中 zh/en 描述，其它命令行不误伤', () => {
  assert.equal(isModelCommandRow('模型model选择本会话使用的模型'), true)
  assert.equal(isModelCommandRow('ModelmodelSelect the model for this conversation'), true)
  assert.equal(isModelCommandRow('权限permission切换权限预设（沙箱模式与审批策略）'), false)
  assert.equal(isModelCommandRow('压缩compact压缩以上对话内容'), false)
  assert.equal(isModelCommandRow(''), false)
  assert.equal(isModelCommandRow(null), false)
  assert.equal(isModelCommandRow(undefined), false)
})

test('IM 桥接会话行遮蔽：树行/搜索行 + marker 钩子 + 标题前缀族（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(
    source.includes('[role="treeitem"][aria-selected], button[class*="searchResultRow"]'),
    'missing session-row selector',
  )
  assert.ok(source.includes('data-dsh-im-session-channel'), 'missing dsh-im marker hook')
  assert.ok(source.includes('imSessionRows'), 'missing mask item wiring')
})

test('IM 桥接会话标题指纹：命中各通道前缀，普通会话不误伤', () => {
  assert.equal(isImSessionTitle('Matrix · liliubing ↔ AI'), true)
  assert.equal(isImSessionTitle('微信 · 张三'), true)
  assert.equal(isImSessionTitle('Telegram · chat'), true)
  assert.equal(isImSessionTitle('Matrix · '), false, '前缀后必须非空')
  assert.equal(isImSessionTitle('新会话'), false)
  assert.equal(isImSessionTitle('Matrix 报告'), false)
  assert.equal(isImSessionTitle(''), false)
  assert.equal(isImSessionTitle(null), false)
})

test('触发候选菜单命令行收口：只留「文件 / 目标 / 计划」，技能与引用免收', () => {
  // 保留项（宿主行文本 = 中文名 + 英文命令名，见店主截图）
  assert.equal(isMenuKeepRow('文件file'), true)
  assert.equal(isMenuKeepRow('目标goal设置或查看长期任务目标'), true)
  assert.equal(isMenuKeepRow('计划plan进入或退出计划模式'), true)
  // 收口项（2026-09-30 店主口径：➕ 里一律不露出）
  assert.equal(isMenuKeepRow('反馈feedback发送关于当前会话的反馈'), false)
  assert.equal(isMenuKeepRow('压缩compact压缩以上对话内容'), false)
  assert.equal(isMenuKeepRow('权限permission切换权限预设（沙箱模式与审批策略）'), false)
  assert.equal(isMenuKeepRow('下载日志export将会话内容导出为 ZIP'), false)
  assert.equal(isMenuKeepRow(''), false)
  assert.equal(isMenuKeepRow(null), false)
  assert.equal(isMenuKeepRow(undefined), false)
  // 来源免收：技能 / @ 引用（宿主原生能力，不在命令行收口范围）
  assert.equal(isMenuRowExempt('dsh-slash-option-skill-0'), true)
  assert.equal(isMenuRowExempt('dsh-slash-option-@-0'), true)
  assert.equal(isMenuRowExempt('dsh-slash-option-command-3'), false)
  assert.equal(isMenuRowExempt(''), false)
  assert.equal(isMenuRowExempt(null), false)
})

test('权限胶囊指纹：命中 zh/en aria-label，其它按钮不误伤', () => {
  assert.equal(isAccessModeLabel('访问模式，当前：完全权限'), true)
  assert.equal(isAccessModeLabel('Access mode, current: Full access'), true)
  assert.equal(isAccessModeLabel('命令'), false)
  assert.equal(isAccessModeLabel('打开目录'), false)
  assert.equal(isAccessModeLabel(''), false)
  assert.equal(isAccessModeLabel(null), false)
  assert.equal(isAccessModeLabel(undefined), false)
})

test('菜单命令行收口 + 权限胶囊：源码级接线守卫', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('MENU_KEEP_HINTS'), 'missing menu keep-list hints')
  assert.ok(source.includes('menuExtras'), 'missing menuExtras wiring')
  assert.ok(source.includes('ACCESS_MODE_HINTS'), 'missing access-mode hints')
  assert.ok(source.includes('permissionChip'), 'missing permissionChip wiring')
})

test('分组标题孤儿判定：整组命令行被收掉时标题一并隐藏', () => {
  // 2026-09-30 实测：菜单只剩「文件/目标/计划」，底下却还挂着「指令」两个字。
  assert.equal(isOrphanGroupTitle([false, false, false]), true)
  assert.equal(isOrphanGroupTitle([false, true]), false, '还有一行可见 → 标题必须留')
  assert.equal(isOrphanGroupTitle([true]), false)
  assert.equal(isOrphanGroupTitle([]), false, '无行候选（pending/空组）不能判成孤儿')
})

test('分组标题收口：源码级接线守卫', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('COMMAND_GROUP_TITLE_SELECTOR'), 'missing group-title selector')
  assert.ok(source.includes('isOrphanGroupTitle'), 'missing orphan-title predicate')
  assert.ok(source.includes('groupRowVisibility'), 'missing group row visibility walker')
  assert.ok(
    source.includes('[data-slot="conversation.input.overlay"] [role="presentation"][data-source]'),
    'group title selector must anchor on role + data-source (hashed class is unstable)',
  )
})

test('会话头部「更多操作」(⋯) 指纹：命中 zh/en，其它按钮不误伤', () => {
  assert.equal(isHeaderMoreLabel('更多操作'), true)
  assert.equal(isHeaderMoreLabel(' 更多操作 '), true)
  assert.equal(isHeaderMoreLabel('More actions'), true)
  assert.equal(isHeaderMoreLabel('更多'), false)
  assert.equal(isHeaderMoreLabel('命令'), false)
  assert.equal(isHeaderMoreLabel('打开目录'), false)
  assert.equal(isHeaderMoreLabel(''), false)
  assert.equal(isHeaderMoreLabel(null), false)
  assert.equal(isHeaderMoreLabel(undefined), false)
})

test('更多操作按钮遮蔽：源码级接线守卫', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('HEADER_MORE_LABELS'), 'missing header-more labels')
  assert.ok(source.includes('button[aria-label="更多操作"]'), 'missing header-more selector')
  assert.ok(source.includes('headerMore'), 'missing headerMore wiring')
})

test('文档预览「查看器切换」菜单收口：数据锚 + mask 接线 + 默认遮蔽（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes("'[data-document-viewer-menu]'"), 'missing viewer-menu data anchor')
  assert.ok(source.includes('documentViewerMenu'), 'missing documentViewerMenu mask item wiring')
  assert.ok(source.includes("if (maskEnabled('documentViewerMenu'))"), 'missing DOM pass branch')
  assert.equal(maskEnabled('documentViewerMenu'), true, '客户形态默认遮蔽（行为零变化）')
})

test('界面收口开关：总开关 + 每项一配置，默认全遮（行为零变化）', () => {
  assert.equal(config.mask.master, true, '总开关默认必须为客户形态（按 items 遮蔽）')
  const ids = Object.keys(config.mask.items).sort()
  assert.deepEqual(
    ids,
    Object.keys(MASK_ITEM_TITLES).sort(),
    'config.mask.items 与引擎清单（MASK_ITEM_TITLES）必须逐项对齐',
  )
  assert.equal(
    ids.length,
    20,
    '收口项共 20 项（最新五项：菜单命令行 / composer 权限胶囊 / 头部「更多操作」/ 启动页 vendor 字样 / 文档预览「查看器切换」菜单）',
  )
  for (const id of ids) {
    assert.equal(
      (config.mask.items as Record<string, boolean>)[id],
      true,
      `默认必须保持遮蔽（行为零变化）：${id}`,
    )
  }
  assert.equal(maskEnabled('turnUsage'), true)
  assert.equal(maskEnabled('menuModel'), true)
  assert.equal(maskEnabled('imSessionRows'), true)
  assert.equal(maskEnabled('menuExtras'), true)
  assert.equal(maskEnabled('permissionChip'), true)
  assert.equal(maskEnabled('headerMore'), true)
  assert.equal(maskEnabled('bootWordmark'), true)
})

test('启动页 vendor 字样收口：客户端兜底规则与宿主半区首帧注入逐条一致', async () => {
  assert.ok(BOOT_BRAND_RULES.length >= 4, '首帧注入规则数不应退化')
  for (const rule of BOOT_BRAND_RULES) {
    assert.ok(rule.includes('[data-dsh-boot]'), `规则必须锚定启动页: ${rule}`)
  }
  // 客户端兜底（CSS_RULES_BY_ITEM.bootWordmark）与宿主半区（BOOT_BRAND_RULES）同文——
  // 两侧漂移会让「插件加载后」与「首帧」表现不一致。
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('bootWordmark'), 'missing bootWordmark wiring')
  for (const rule of BOOT_BRAND_RULES) {
    assert.ok(source.includes(rule), `客户端兜底缺同文规则: ${rule}`)
  }
})

test('内测声明弹窗指纹：命中 zh/en，普通对话框不误伤', async () => {
  assert.equal(isWelcomeNoticeLabel('内测声明'), true)
  assert.equal(isWelcomeNoticeLabel(' Internal Testing Notice '), true)
  assert.equal(isWelcomeNoticeLabel('设置'), false)
  assert.equal(isWelcomeNoticeLabel('内测声明与版本'), false)
  assert.equal(isWelcomeNoticeLabel(''), false)
  assert.equal(isWelcomeNoticeLabel(null), false)
  assert.equal(isWelcomeNoticeLabel(undefined), false)
})

// —— 账号行 / 退出登录守卫（客户线，2026-09-29 并入）——
test('账号 localpart 提取：Matrix 全名与裸账号，畸形输入不产半截 UI', () => {
  assert.equal(accountLocalpart('@sbqy01:im.10rig.com'), 'sbqy01')
  assert.equal(accountLocalpart('sbqy01'), 'sbqy01')
  assert.equal(accountLocalpart(' @zb1:im.10rig.com '), 'zb1')
  assert.equal(accountLocalpart('@:im.10rig.com'), null)
  assert.equal(accountLocalpart('  '), null)
  assert.equal(accountLocalpart(''), null)
})

test('门户身份应答判据：ok:true + account 才算数（未登录/HTML 中间页一律 null）', () => {
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@sbqy01:im.10rig.com', customer: 'zb' }),
    { username: 'sbqy01', displayName: null },
  )
  assert.equal(parsePortalAccount({ ok: false, error: 'not_authenticated' }), null)
  assert.equal(parsePortalAccount({ ok: true }), null)
  assert.equal(parsePortalAccount({ ok: true, account: '@:im.10rig.com' }), null)
  assert.equal(parsePortalAccount('<!doctype html>'), null)
  assert.equal(parsePortalAccount(null), null)
})

test('门户身份应答：名册姓名（displayName）可选透传；空白/非字符串 = null', () => {
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@liliubing:im.10rig.com', displayName: '李六兵' }),
    { username: 'liliubing', displayName: '李六兵' },
  )
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@liliubing:im.10rig.com', displayName: ' 李六兵\n' }),
    { username: 'liliubing', displayName: '李六兵' },
  )
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@liliubing:im.10rig.com' }),
    { username: 'liliubing', displayName: null },
  )
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@liliubing:im.10rig.com', displayName: '   ' }),
    { username: 'liliubing', displayName: null },
  )
  assert.deepEqual(
    parsePortalAccount({ ok: true, account: '@liliubing:im.10rig.com', displayName: 7 }),
    { username: 'liliubing', displayName: null },
  )
})

test('账号行展示名：中文名优先、缺省回落 localpart；头像首字取展示名', () => {
  assert.equal(accountDisplayName({ username: 'liliubing', displayName: '李六兵' }), '李六兵')
  assert.equal(accountDisplayName({ username: 'liliubing', displayName: null }), 'liliubing')
  assert.equal(avatarInitial('李六兵'), '李')
  assert.equal(avatarInitial('sbqy01'), 'S')
})

test('侧栏折叠自适应：宿主折叠态（data-sidebar-collapsed）账号行只留头像（源码级守卫）', async () => {
  const base = await readFile(join(root, 'src/client/styles/base.css.ts'), 'utf8')
  assert.ok(
    base.includes('[data-sidebar-collapsed="true"] [data-mobile-nav="account-name"]'),
    'missing collapsed-sidebar account-name hide',
  )
  assert.ok(
    base.includes(
      '[data-sidebar-collapsed="true"]:has([data-mobile-nav="account-menu"]) > :first-child',
    ),
    'missing collapsed-sidebar menu overflow release',
  )
  // 锚点红线：折叠规则只能锚宿主原生的 data-sidebar-collapsed；[data-dsh-frame] /
  // [data-pane] 是 @linxin666/dsh-web-all 注入的装饰锚，客户实例不跑该插件
  // （2026-09-30 实例实测：frame 上只有 data-sidebar-collapsed + data-rightbar-collapsed），
  // 靠它 = 规则在客户形态静默失效（本轮首版修复就栽在这里）。
  assert.ok(
    !base.includes('[data-dsh-frame][data-sidebar-collapsed'),
    'collapsed rules must not depend on the dsh-web-all decorator markers',
  )
  const card = await readFile(join(root, 'src/client/components/AccountCard.tsx'), 'utf8')
  assert.ok(card.includes('accountDisplayName('), 'account row must show the roster display name')
})

test('头像首字：首字符大写，空串退化 ?', () => {
  assert.equal(avatarInitial('sbqy01'), 'S')
  assert.equal(avatarInitial('9zb'), '9')
  assert.equal(avatarInitial(''), '?')
})

test('账号行注册与「刻意跨宽度」：桌面退出入口是 2026-09-29 约定的例外（源码级守卫）', async () => {
  const index = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(index.includes("id: 'mobile-nav-account'"), 'missing account row registration')
  assert.ok(
    index.includes("id: 'mobile-nav-account',\n    order: 1,"),
    'account row must sit above the session-log pill (order 1)',
  )
  assert.ok(
    !index.includes("id: 'mobile-nav-account',\n    order: 20,"),
    'stale footer-bottom order (20) must be gone from the account registration',
  )
  const base = await readFile(join(root, 'src/client/styles/base.css.ts'), 'utf8')
  assert.ok(base.includes('[data-mobile-nav="account-button"]'), 'missing account row styles')
  // 桌面遮蔽块（misc.css.ts）不得包含 account 标记——客户桌面同样要有退出入口。
  const misc = await readFile(join(root, 'src/client/styles/misc.css.ts'), 'utf8')
  const prelude = '@media (min-width: 1024px), (pointer: fine), (pointer: none) {'
  const start = misc.indexOf(prelude)
  assert.notEqual(start, -1, 'desktop hide block not found')
  const hide = misc.slice(start, misc.indexOf('\n}', start))
  assert.ok(
    !hide.includes('data-mobile-nav="account'),
    'account row must NOT be hidden on desktop (customer logout entry)',
  )
})

// —— 页面版本跟随（自动刷新，客户线；2026-09-30 并入）——
test('启动图 rev 抽取：只认对象形状的非空字符串 rev', () => {
  assert.equal(bootRevOf({ rev: 'abc123456789' }), 'abc123456789')
  assert.equal(bootRevOf({ rev: 12 }), null)
  assert.equal(bootRevOf({ rev: '' }), null)
  assert.equal(bootRevOf({}), null)
  assert.equal(bootRevOf(null), null)
  assert.equal(bootRevOf('rev'), null)
  assert.equal(bootRevOf(undefined), null)
})

test('从 index HTML 抽 rev：取顶层 rev、容忍 \\u003c 转义与后续脚本', () => {
  const html = [
    '<!doctype html><html><head>',
    '<script>globalThis["__DSH_BOOT__"] = {"rev":"top000000000","entries":[{"id":"dsh-web-mobile","rev":"nested000001","url":"plugins/dsh-web-mobile/client.js?rev=nested000001"}],"batches":[{"phase":"bootstrap","url":"plugins/…","rev":"bat000000001"}]}</script>',
    '<script>var tail = 1</script>',
    '</head></html>',
  ].join('')
  assert.equal(bootRevInHtml(html), 'top000000000')
  // 宿主对 JSON 值里的 `<` 做 \u003c 转义——JSON.parse 还原为 `<`，不影响抽取
  assert.equal(
    bootRevInHtml('globalThis["__DSH_BOOT__"] = {"rev":"a\\u003cb"}</script>'),
    'a<b',
  )
  // 登录页 / 旧宿主 / 中间层改写 / 无闭合脚本：一律抽不到 → null（调用方静默跳过）
  assert.equal(bootRevInHtml('<html><body>login</body></html>'), null)
  assert.equal(bootRevInHtml('globalThis["__DSH_BOOT__"] = {broken</script>'), null)
  assert.equal(bootRevInHtml('globalThis["__DSH_BOOT__"] = {"rev":"x"}'), null)
})

test('自动刷新记账：同目标封顶、换目标重新起算（防刷新循环）', () => {
  assert.equal(autoReloadAllowed('v2', null), true)
  assert.equal(autoReloadAllowed('v2', { target: 'v2', attempts: 1 }), true)
  assert.equal(autoReloadAllowed('v2', { target: 'v2', attempts: AUTO_RELOAD_MAX_PER_TARGET }), false)
  assert.equal(autoReloadAllowed('v3', { target: 'v2', attempts: AUTO_RELOAD_MAX_PER_TARGET }), true)
  assert.deepEqual(autoReloadNextState('v2', null), { target: 'v2', attempts: 1 })
  assert.deepEqual(autoReloadNextState('v2', { target: 'v2', attempts: 1 }), { target: 'v2', attempts: 2 })
  assert.deepEqual(autoReloadNextState('v3', { target: 'v2', attempts: 2 }), { target: 'v3', attempts: 1 })
})

test('页面版本跟随：no-store 取根 + 可见性门 + 输入中推迟 + 刷新在记账门之后（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  // 取件必须绕缓存——否则读到的可能正是要避免的旧 HTML
  assert.ok(source.includes("cache: 'no-store'"), 'missing no-store fetch')
  // 隐藏期间不发检查；回前台由 visibilitychange / pageshow 补
  assert.ok(source.includes("document.visibilityState !== 'visible'"), 'missing visibility gate')
  assert.ok(source.includes("addEventListener('visibilitychange', onVisibility)"), 'missing visibilitychange wiring')
  assert.ok(source.includes("addEventListener('pageshow', onPageShow)"), 'missing pageshow wiring')
  // 正在输入不打断（焦点在输入控件 → 推迟重试）
  assert.ok(source.includes('isEditableFocused(document)'), 'missing editable-focus deferral')
  // 武装标记：探针靠它区分「装上了」与「静默惰性」
  assert.ok(source.includes("setAttribute('data-mobile-nav-auto-reload', 'armed')"), 'missing armed marker')
  assert.ok(source.includes("removeAttribute('data-mobile-nav-auto-reload')"), 'missing marker disposal')
  // 刷新必须落在记账门之后：先判 autoReloadAllowed、再写新状态、最后 reload
  // （reload 用 lastIndexOf：文件头分节注释里也提到同一个词）
  const allowed = source.indexOf('if (!autoReloadAllowed(fresh, state)) return')
  const write = source.indexOf('writeAutoReloadState(next)')
  const reload = source.lastIndexOf('location.reload()')
  assert.notEqual(allowed, -1, 'missing autoReloadAllowed gate')
  assert.notEqual(write, -1, 'missing writeAutoReloadState call')
  assert.notEqual(reload, -1, 'missing location.reload()')
  assert.ok(allowed < write && write < reload, 'reload must sit behind the attempt-cap gate')
})

test('页面版本跟随已接进客户线入口，且仅客户形态安装（源码级守卫）', async () => {
  const index = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(index.includes('installAutoReload(ctx)'), 'missing installAutoReload(ctx) wiring')
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  const at = source.indexOf('export function installAutoReload')
  assert.notEqual(at, -1, 'missing installAutoReload export')
  const section = source.slice(at, at + 300)
  assert.ok(section.includes('if (!config.mask.master) return'), 'auto reload must install in customer form only')
})

test('改密弹窗（2026-09-29 晚）：菜单项 / 居中弹窗标记 / 门户端点 / 表单校验（源码级守卫）', async () => {
  const card = await readFile(join(root, 'src/client/components/AccountCard.tsx'), 'utf8')
  assert.ok(card.includes('data-mobile-nav="account-password"'), 'missing password menu item')
  assert.ok(card.includes('data-mobile-nav="account-password-overlay"'), 'missing centered overlay')
  assert.ok(card.includes('data-mobile-nav="account-password-dialog"'), 'missing centered dialog card')
  for (const marker of ['password-old', 'password-new', 'password-confirm', 'password-error', 'password-submit', 'password-cancel']) {
    assert.ok(card.includes(`data-mobile-nav="${marker}"`), `missing dialog marker ${marker}`)
  }
  // 无感语义的源码锚：成功后不跳转、由门户在同一响应轮换会话（注释钉在组件里）。
  assert.ok(card.includes('不跳转、不刷新'), 'missing seamless-rotation note')
  const data = await readFile(join(root, 'src/client/components/account-card.ts'), 'utf8')
  assert.ok(data.includes("PORTAL_PASSWORD_PATH = '/__portal/api/password'"), 'missing portal password endpoint')
  assert.equal(validatePasswordForm({ oldPassword: '', newPassword: 'longenough', confirmPassword: 'longenough' }), 'fill')
  assert.equal(validatePasswordForm({ oldPassword: 'a', newPassword: 'short', confirmPassword: 'short' }), 'short')
  assert.equal(validatePasswordForm({ oldPassword: 'a', newPassword: 'longenough1', confirmPassword: 'longenough2' }), 'mismatch')
  assert.equal(validatePasswordForm({ oldPassword: 'a', newPassword: 'longenough1', confirmPassword: 'longenough1' }), null)
  const base = await readFile(join(root, 'src/client/styles/base.css.ts'), 'utf8')
  assert.ok(base.includes('[data-mobile-nav="account-password-dialog"]'), 'missing dialog styles')
  assert.ok(base.includes('[data-mobile-nav="account-password-overlay"]'), 'missing overlay styles')
})

// —— HTML 交互预览 + 浏览器桌面自动弹层（客户线，2026-09-30 并入）——
test('HTML 交互预览注册数据：extension 优先级接管 .html/.htm，与官方 builtin 不重名', () => {
  const def = htmlPreviewDefinition()
  assert.equal(def.id, HTML_LIVE_PREVIEW_ID)
  assert.notEqual(def.id, BUILTIN_HTML_PREVIEW_ID, '注册重名会抛 duplicate implementation')
  assert.deepEqual([...def.extensions], ['html', 'htm'])
  assert.equal(def.priority, 'extension', '插件实现排在 builtin 之前（默认选中取候选第一位）')
  assert.equal(def.loading, 'bytes-complete')
  assert.equal(def.wrap, false)
  assert.ok(['交互预览', 'Interactive preview'].includes(def.title()))
})

test('HTML 交互预览：allow-scripts 沙箱 iframe + bytes 喂入 + 仅客户形态接线（源码级守卫）', async () => {
  const component = await readFile(join(root, 'src/client/components/HtmlLivePreview.tsx'), 'utf8')
  const sandbox = /sandbox="([^"]*)"/.exec(component)
  assert.equal(sandbox?.[1], 'allow-scripts', 'sandbox 必须恰为 allow-scripts（不得放行 same-origin）')
  assert.ok(component.includes('srcDoc={html}'), 'missing srcdoc rendering')
  assert.ok(component.includes("content.kind === 'bytes'"), 'missing bytes-only content gate')
  const effect = await readFile(join(root, 'src/client/effects/html-preview.ts'), 'utf8')
  assert.ok(effect.includes("ctx.inject(['documentPreviews']"), 'missing optional documentPreviews injection')
  assert.ok(effect.includes("ctx.slots.inject('sidebar.right.tab.document'"), 'missing keyed body slot')
  assert.ok(effect.includes('if (!config.mask.master) return'), 'must install in customer form only')
  const index = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(index.includes('installHtmlPreview(ctx)'), 'missing installHtmlPreview wiring')
})

test('浏览器桌面自动弹层：CSS 首帧 + DOM pass 双遮、观察器触发器同步扩（源码级守卫）', async () => {
  const source = await readFile(join(root, 'src/client/effects/deployment-mode.ts'), 'utf8')
  assert.ok(source.includes('section[role="dialog"][aria-label^="浏览器桌面"]'), 'missing zh dialog hide')
  assert.ok(source.includes('section[role="dialog"][aria-label^="Browser desktop"]'), 'missing en dialog hide')
  assert.ok(source.includes('BROWSER_DESKTOP_DIALOG_SELECTOR'), 'missing dialog selector wiring')
  assert.ok(source.includes("'[aria-label*=\"浏览器桌面\"]'"), 'observer trigger must cover the dialog')
})

test('交互预览语言判定：zh 主、en 兜底、未知取中文', () => {
  assert.equal(prefersChinese('zh-CN'), true)
  assert.equal(prefersChinese('ZH'), true)
  assert.equal(prefersChinese('en-US'), false)
  assert.equal(prefersChinese(''), true)
  assert.equal(prefersChinese(null), true)
  assert.equal(prefersChinese(undefined), true)
})

test('HTML 字节解码：UTF-8 容错（坏字节不抛）', () => {
  assert.equal(decodeHtmlBytes(new TextEncoder().encode('<p>你好</p>')), '<p>你好</p>')
  assert.ok(decodeHtmlBytes(new Uint8Array([0xe4, 0xbd])).length > 0)
})

test('底部署名行：文案常量 + 注入接线（源码级守卫）', async () => {
  assert.equal(SHIBEI_SUPPORT_LINE, '拾贝启源 技术支持')
  const fx = await readFile(join(root, 'src/client/effects/brand-footer.ts'), 'utf8')
  assert.ok(!fx.includes('installMobileEffect'), '署名行必须**全宽度**安装（web 端 + 手机端都要有）')
  assert.ok(fx.includes('ctx.effect('), 'missing all-width install')
  assert.ok(fx.includes('例外'), '须在注释里登记「桌面 no-op 契约的有意例外」')
  assert.ok(fx.includes("'[class*=\"_composerStack\"]'"), '锚点必须是 composerStack')
  assert.ok(fx.includes('support-line'), 'missing support-line marker')
  assert.ok(fx.includes('SHIBEI_SUPPORT_LINE'), 'missing copy constant')
  const entry = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(entry.includes('installBrandFooter(ctx)'), '入口未武装该效果')
  const css = await readFile(join(root, 'src/client/styles/base.css.ts'), 'utf8')
  assert.ok(css.includes('[data-mobile-nav="support-line"]'), 'missing support-line styles')
})
