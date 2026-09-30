/** 拾贝品牌图形（wm 静态资产，文件名带内容哈希；2026-09-30 由中贝新标换回拾贝）。 */
export declare const SHIBEI_LOGO_URL = "https://wm.10rig.com:8443/brand/zhongbei-logo.a30739cc.png";
/** 品牌文案（首屏 headline 与侧栏品牌名共用）。2026-09-30 晚定为「中贝智能体」。 */
export declare const SHIBEI_BRAND_NAME = "\u4E2D\u8D1D\u667A\u80FD\u4F53";
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
/**
 * 宿主发布构建烘焙的浏览器标题（`DSH_CLIENT_TITLE`；dsh-client-ui-brand-official
 * README 原文「浏览器标题独立——`DSH_CLIENT_TITLE` 在构建时选择标题文本，而非通过
 * UI slot」）。运行时不读环境变量、也没有品牌配置面，插件只能做 DOM 覆盖。
 */
export declare const HOST_PRODUCT_TITLE = "DeepSeek Harness";
/**
 * 把浏览器标题里的宿主产品名替换为品牌名。
 * 宿主布局层（ui-layout 的 DocumentTitle）把标题写成裸产品名，或
 * 「`<会话名> — <产品名>`」（会话切换 / 流式标题更新都会重写）；两种形态都替换。
 * 不含宿主要素时原样返回 —— 幂等，可反复作用于自身输出（观察器写入不回环）。
 * @param title - 当前 document.title。
 * @returns 应写入的标题。
 */
export declare function applyBrandTitle(title: string): string;
//# sourceMappingURL=brand.d.ts.map