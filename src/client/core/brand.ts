// brand.ts — 中贝智能体品牌常量与判据（品牌位占位与首屏文案替换共用）。
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
//
// 品牌名史：拾贝起源点智成金（2026-09-28）→ 中贝通信（2026-09-30）→
// 拾贝智能体（2026-09-30 白天）→ 中贝智能体（2026-09-30 晚，本值；图形一并还原成「中贝」那套）。

/** 拾贝品牌图形（wm 静态资产，文件名带内容哈希；2026-09-30 由中贝新标换回拾贝）。 */
export const SHIBEI_LOGO_URL =
  'https://wm.10rig.com:8443/brand/zhongbei-logo.a30739cc.png'

/** 品牌文案（首屏 headline 与侧栏品牌名共用）。2026-09-30 晚定为「中贝智能体」。 */
export const SHIBEI_BRAND_NAME = '中贝智能体'

/**
 * 会话底部署名行（2026-09-30 店主口径）：客户形态在会话最下面显示「拾贝启源 技术支持」。
 * 由 effects/brand-footer.ts 注入到 composerStack 末尾（状态行之下）。
 */
export const SHIBEI_SUPPORT_LINE = '拾贝启源 技术支持'

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

/**
 * 宿主发布构建烘焙的浏览器标题（`DSH_CLIENT_TITLE`；dsh-client-ui-brand-official
 * README 原文「浏览器标题独立——`DSH_CLIENT_TITLE` 在构建时选择标题文本，而非通过
 * UI slot」）。运行时不读环境变量、也没有品牌配置面，插件只能做 DOM 覆盖。
 */
export const HOST_PRODUCT_TITLE = 'DeepSeek Harness'

/**
 * 把浏览器标题里的宿主产品名替换为品牌名。
 * 宿主布局层（ui-layout 的 DocumentTitle）把标题写成裸产品名，或
 * 「`<会话名> — <产品名>`」（会话切换 / 流式标题更新都会重写）；两种形态都替换。
 * 不含宿主要素时原样返回 —— 幂等，可反复作用于自身输出（观察器写入不回环）。
 * @param title - 当前 document.title。
 * @returns 应写入的标题。
 */
export function applyBrandTitle(title: string): string {
  return title.includes(HOST_PRODUCT_TITLE)
    ? title.split(HOST_PRODUCT_TITLE).join(SHIBEI_BRAND_NAME)
    : title
}
