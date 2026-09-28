// 品牌改造回归（拾贝起源，2026-09-28）：
// 常量形状、首屏标语判据（精确匹配、不误伤聊天内容），以及 index.tsx 里三个品牌位
// 注册的存在性（源码级守卫——slot 名拼错的失败模式是静默回退到官方鱼标）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HOST_HERO_HEADLINES,
  HOST_PREVIEW_BADGES,
  SHIBEI_BRAND_NAME,
  SHIBEI_LOGO_URL,
  isHostHeroHeadline,
  isHostPreviewBadgeText,
} from '../src/client/core/brand.ts'

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
  assert.equal(SHIBEI_BRAND_NAME, '拾贝起源点智成金')
  assert.match(
    SHIBEI_LOGO_URL,
    /^https:\/\/maas-test\.10rig\.com\/static\/image\/shibei-origin-logo\.[0-9a-f]+\.png$/,
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
