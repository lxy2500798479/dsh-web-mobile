/**
 * 部署形态开关（编译期常量）。
 *
 * 改这里 → `pnpm build` → 本地重载 / 实例重打镜像即生效。默认 = 客户生产形态。
 *
 * devMode:
 *  - `false`（默认，客户生产形态）：隐藏 轨迹 / 本轮代码差异 / 预设切换（走宿主官方
 *    `ui-settings.developerTools` 门，本插件启动时按此开关同步它）+ 设置 / 浏览器 / 插件
 *    面板行（DOM 遮蔽）+ 模型选择座位（slot 遮蔽）。普通业务用户只看到聊天本体。
 *  - `true`（开发调试形态）：以上入口全部恢复显示（含官方门打开）。
 *
 * 设计取舍：宿主 0.1.7 线自带 `ui-settings.developerTools`（默认 **开**，官方原文
 * "New installations and missing values enable the full interface"）——轨迹/代码差异/
 * 预设切换三种入口都由它门控，所以这里不重复造轮子，只把它同步成我们的开关值；
 * 官方没有门的（设置/浏览器/插件/模型座位）才由本插件自己遮蔽。一个开关、一处配置，
 * 不至于散落乱改。
 */
export const config = {
  /** 开发调试形态：true = 显示全部开发/高级入口。 */
  devMode: false,
} as const
