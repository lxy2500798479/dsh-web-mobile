// 品牌改造回归（中贝通信，2026-09-28）：
// 常量形状、首屏标语判据（精确匹配、不误伤聊天内容），以及 index.tsx 里三个品牌位
// 注册的存在性（源码级守卫——slot 名拼错的失败模式是静默回退到官方鱼标）。
// 2026-09-29 追加：客户形态控件遮蔽守卫（deployment-mode 的「浏览器桌面」指纹 +
// 文件浏览按钮 / 预设 chip 选择器；新测试文件受 AGENTS.md 文件数契约约束，故并入）。
// 2026-09-29 再追加：账号行/退出登录守卫（account-card 纯函数 + 注册与
// 「刻意跨宽度」源码级守卫；同样并入）。
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
  isBrowserDesktopLabel,
  isWelcomeNoticeLabel,
  shouldHidePanelLabel,
} from '../src/client/effects/deployment-mode.ts'
import {
  accountLocalpart,
  avatarInitial,
  parsePortalAccount,
} from '../src/client/components/account-card.ts'

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
  assert.equal(SHIBEI_BRAND_NAME, '中贝通信')
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

test('面板行隐藏判据保持既有契约（文件浏览不误伤）', () => {
  assert.equal(shouldHidePanelLabel('插件'), true)
  assert.equal(shouldHidePanelLabel('Browser'), true)
  assert.equal(shouldHidePanelLabel('文件浏览'), false)
  assert.equal(shouldHidePanelLabel(null), false)
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
  assert.ok(source.includes('CUSTOMER_STEALTH_CSS'), 'missing stealth CSS')
  assert.ok(source.includes(':has([role="dialog"]'), 'missing :has overlay selector')
  assert.ok(!source.includes('button.click()'), 'must NOT auto-click the welcome continue')
})

test('内测声明弹窗指纹：命中 zh/en，普通对话框不误伤', () => {
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
    { username: 'sbqy01' },
  )
  assert.equal(parsePortalAccount({ ok: false, error: 'not_authenticated' }), null)
  assert.equal(parsePortalAccount({ ok: true }), null)
  assert.equal(parsePortalAccount({ ok: true, account: '@:im.10rig.com' }), null)
  assert.equal(parsePortalAccount('<!doctype html>'), null)
  assert.equal(parsePortalAccount(null), null)
})

test('头像首字：首字符大写，空串退化 ?', () => {
  assert.equal(avatarInitial('sbqy01'), 'S')
  assert.equal(avatarInitial('9zb'), '9')
  assert.equal(avatarInitial(''), '?')
})

test('账号行注册与「刻意跨宽度」：桌面退出入口是 2026-09-29 约定的例外（源码级守卫）', async () => {
  const index = await readFile(join(root, 'src/client/index.tsx'), 'utf8')
  assert.ok(index.includes("id: 'mobile-nav-account'"), 'missing account row registration')
  assert.ok(index.includes('order: 20'), 'account row must sit at the footer bottom (order 20)')
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
