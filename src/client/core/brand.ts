// brand.ts — 拾贝起源品牌常量与判据（品牌位占位与首屏文案替换共用）。
// 零 DOM、零运行时 import：node --test 可直跑（type-stripping）。
//
// 品牌机制（2026-09-28）：
// - logo 与侧栏名占据官方预留的品牌 slot（conversation.hero.brand.mark /
//   sidebar.brand.mark / sidebar.brand.name）。官方的组合路径就是「占据 slot」——
//   dsh-client-ui-brand-official README「替换品牌」节原文：自有身份的部署不组合
//   该包，而是组合另一个占据这些 slot 的包；不存在任何品牌配置面。
// - 首屏标语「探索未至之境」不是 slot（硬写在 conversation 命名空间字典，且
//   dsh-client-locale 的 register 对同命名空间同 locale 重复注册会直接抛错），
//   只能做 DOM 替换，见 effects/brand-headline.ts。

/** 拾贝起源品牌图形（maas-test 静态资源，文件名带内容哈希）。 */
export const SHIBEI_LOGO_URL =
  'https://maas-test.10rig.com/static/image/shibei-origin-logo.036e3d268e.png'

/** 品牌文案（首屏 headline 与侧栏品牌名共用）。 */
export const SHIBEI_BRAND_NAME = '拾贝起源点智成金'

/** 宿主首屏标语的已知原文（zh / en 两套字典的 hero.headline）。 */
export const HOST_HERO_HEADLINES: readonly string[] = ['探索未至之境', 'Into the Unknown']

/** 宿主首屏「预览版」徽标的已知文案（zh / en 两套字典的 hero.preview）。 */
export const HOST_PREVIEW_BADGES: readonly string[] = ['预览版', 'Preview']

/**
 * 是否为宿主首屏标语（两侧空白不计、精确匹配）。
 * @param text - 候选元素的文本。
 * @returns true = 应替换为 {@link SHIBEI_BRAND_NAME}。
 */
export function isHostHeroHeadline(text: string | null | undefined): boolean {
  return typeof text === 'string' && HOST_HERO_HEADLINES.includes(text.trim())
}

/**
 * 是否为宿主首屏的「预览版」徽标文案（两侧空白不计、精确匹配）。
 * 徽标的首选锚点是 class 本地名 `previewBadge`（见 effects/brand-headline.ts），
 * 文案判据作为跨代兜底。
 * @param text - 候选元素的文本。
 * @returns true = 应移除该徽标。
 */
export function isHostPreviewBadgeText(text: string | null | undefined): boolean {
  return typeof text === 'string' && HOST_PREVIEW_BADGES.includes(text.trim())
}
