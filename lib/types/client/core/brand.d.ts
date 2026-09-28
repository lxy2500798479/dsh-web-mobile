/** 拾贝起源品牌图形（maas-test 静态资源，文件名带内容哈希）。 */
export declare const SHIBEI_LOGO_URL = "https://maas-test.10rig.com/static/image/shibei-origin-logo.036e3d268e.png";
/** 品牌文案（首屏 headline 与侧栏品牌名共用）。 */
export declare const SHIBEI_BRAND_NAME = "\u62FE\u8D1D\u8D77\u6E90\u70B9\u667A\u6210\u91D1";
/** 宿主首屏标语的已知原文（zh / en 两套字典的 hero.headline）。 */
export declare const HOST_HERO_HEADLINES: readonly string[];
/** 宿主首屏「预览版」徽标的已知文案（zh / en 两套字典的 hero.preview）。 */
export declare const HOST_PREVIEW_BADGES: readonly string[];
/**
 * 是否为宿主首屏标语（两侧空白不计、精确匹配）。
 * @param text - 候选元素的文本。
 * @returns true = 应替换为 {@link SHIBEI_BRAND_NAME}。
 */
export declare function isHostHeroHeadline(text: string | null | undefined): boolean;
/**
 * 是否为宿主首屏的「预览版」徽标文案（两侧空白不计、精确匹配）。
 * 徽标的首选锚点是 class 本地名 `previewBadge`（见 effects/brand-headline.ts），
 * 文案判据作为跨代兜底。
 * @param text - 候选元素的文本。
 * @returns true = 应移除该徽标。
 */
export declare function isHostPreviewBadgeText(text: string | null | undefined): boolean;
//# sourceMappingURL=brand.d.ts.map