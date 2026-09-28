import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { SHIBEI_BRAND_NAME, SHIBEI_LOGO_URL } from '../core/brand.ts'

/**
 * 拾贝起源品牌位（2026-09-28）：占官方预留品牌 slot 的三个组件。
 *
 * 只占据 slot、不改宿主源码；宿主给首屏 mark 的 className 是鱼形动画类
 * （pXSMma_fish 的 hover 游动），自有 Logo 不继承——尺寸走数值 props，几何靠
 * 宿主的 hitbox 容器。圆角随尺寸缩放（原图是白底方图）。
 *
 * 跨代说明：本包的编译基线是 rc.6 代宿主类型（tsconfig paths → node_modules
 * 副本），该代还没声明这三个品牌槽位（0.1.7 线才有），因此在这里补声明——
 * 与 runtime 自己给 'root' 槽位做 augmentation 是同一机制。旧宿主上槽位声明
 * 不存在 → `slots.inject` 的回调永不触发 → 注册静默缺席（惰性，无报错）。
 * 宿主类型副本将来升级到已含这些槽位的代际时，删除本 augment（同名成员类型
 * 不一致时接口合并会报错，正是提醒信号）。
 */

/** 首屏品牌位的宿主供参（镜像 0.1.7 线宿主的 HeroBrandMarkOwnerProps）。 */
interface ShibeiHeroBrandMarkProps {
  /** Requested square edge in pixels. */
  size: number
  /** Host class preserving the surrounding mark geometry. */
  className?: string | undefined
}

/** 侧栏品牌图形的宿主供参（镜像 SidebarBrandMarkOwnerProps）。 */
interface ShibeiSidebarBrandMarkProps {
  /** Requested square edge in pixels. */
  size: number
}

/** 侧栏品牌名的宿主供参（镜像 SidebarBrandNameOwnerProps，占位者自持内容）。 */
interface ShibeiSidebarBrandNameProps {
  /** Marker field: the occupant owns its own content and width. */
  children?: never
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 0.1.7 线宿主：首屏品牌位（回退 = 动画鱼）。 */
    'conversation.hero.brand.mark': {
      kind: 'single'
      scope: 'root'
      owner: ShibeiHeroBrandMarkProps
    }
    /** 0.1.7 线宿主：侧栏品牌图形位（回退 = 鱼形）。 */
    'sidebar.brand.mark': {
      kind: 'single'
      scope: 'root'
      owner: ShibeiSidebarBrandMarkProps
    }
    /** 0.1.7 线宿主：侧栏品牌名位（回退 = 本地构建标签）。 */
    'sidebar.brand.name': {
      kind: 'single'
      scope: 'root'
      owner: ShibeiSidebarBrandNameProps
    }
  }
}

/** 方形品牌图形（首屏 34px / 侧栏 24px）。 */
function BrandMarkImage({ size }: { size: number }) {
  return (
    <img
      src={SHIBEI_LOGO_URL}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{
        display: 'block',
        flex: 'none',
        borderRadius: Math.max(4, Math.round(size * 0.2)),
        objectFit: 'contain',
      }}
    />
  )
}

/** 首屏品牌图形占位（conversation.hero.brand.mark，替换鱼形动画 fallback）。 */
export function HeroBrandMark({ size }: PropsRuntime<'conversation.hero.brand.mark'>) {
  return <BrandMarkImage size={size} />
}

/** 侧栏品牌图形占位（sidebar.brand.mark，展开行与折叠轨道共用同一注册）。 */
export function SidebarBrandMark({ size }: PropsRuntime<'sidebar.brand.mark'>) {
  return <BrandMarkImage size={size} />
}

/** 侧栏品牌名占位（sidebar.brand.name，替换「本地构建」回退文案）。 */
export function SidebarBrandName(_props: PropsRuntime<'sidebar.brand.name'>) {
  return (
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {SHIBEI_BRAND_NAME}
    </span>
  )
}
