---
kind: design
status: active
date: 2026-09-29
---

# 客户形态遮蔽 · 代码层开关化（每项一配置 + 总开关）

> 店主口径（2026-09-29）：开关是**代码层面**的（本插件源码里的配置），**不是配置到界面**。
> 本稿替代同日早先的「界面面板 / 运行时配置」方案（已废弃，勿再参考）。

## 目标

把「客户形态遮蔽」从**散落的硬编码**收敛成**一处代码层配置**：

- **每项遮蔽 = 一个配置项**（可单独开/关）；
- **一个总开关**：关 = 全部恢复官方原貌（等价今天的开发/管理形态全开）；
- 后续要回开某项：改配置里**一行**（`true` → `false`）→ `pnpm build` → 随既有发布链路滚动；不再翻多个文件改代码；
- **行为零变化**：默认值与今天的客户形态完全一致（纯收敛 + 开关化，不加新行为）。

## 配置形态（唯一开关面：`src/client/config.ts`）

```ts
export const config = {
  /**
   * 界面收口总开关：
   *  true（默认，客户形态）= 按 items 逐项遮蔽；
   *  false（开发/管理形态）= 全部恢复官方原貌（= 原 devMode: true 的语义）。
   */
  mask: {
    master: true,
    /** 逐项遮蔽开关：true = 遮蔽；false = 该处恢复显示。 */
    items: {
      devtools: true,         // 轨迹 / 本轮代码差异 / 预设切换（官方 developerTools 门）
      modelSeat: true,        // 模型选择座位（slot 不注册）
      seatSettings: true,     // 设置入口（[data-slot="sidebar.settings"]）
      rowPlugins: true,       // 面板行「插件」
      rowBrowser: true,       // 面板行「浏览器」
      mobileNavFiles: true,   // 移动壳「文件浏览」按钮
      headerPresetChip: true, // 会话头部预设 chip「标准模式」
      browserDesktop: true,   // 侧栏「浏览器桌面」入口
      menuModel: true,        // 触发候选菜单「模型」行
      welcomeDialog: true,    // 「内测声明」弹窗（CSS 首帧 + 摘 inert）
      openInApp: true,        // 「用文件管理器打开」整族
      twinDesk: true,         // 「分身工作台」按钮
      terminalCard: true,     // 「新建终端」入口卡
      turnUsage: true,        // 本轮用量胶囊
    },
  },
} as const
```

原 `devMode` 退役：语义并入 `mask.master`（`devMode: true` ⇔ `mask.master: false`），不保留两个开关。

## 引擎改造（`src/client/effects/deployment-mode.ts` / `src/client/index.tsx`）

- 遮蔽清单 → 数据表 `MASK_ITEMS: { id, 名称, 机制, 规则数据 }[]`（**id 对齐** `config.mask.items`）；
- 各执行器按配置过滤：
  - **CSS 首帧**：只拼启用项的规则；`master=false` 不注入 style 标签；
  - **DOM pass + 观察器**：只跑启用项的选择器/指纹；
  - **官方 developerTools 门**：按 `devtools` 项同步；
  - **模型座位**：`index.tsx` 按 `modelSeat` 项决定是否注册遮蔽；
- 文案指纹纯函数（`isBrowserDesktopLabel` / `isModelCommandRow` 等）保持现状，归属到对应项内部；
- 行为等价性：`master=true` + 全项 `true` ≡ 今天的 `devMode=false`。

| 配置 | 行为 |
|---|---|
| `master=true` + 全项 `true` | **今天的客户形态**（默认） |
| `master=true` + 某项 `false` | 只回开该项 |
| `master=false` | 全开（= 今天的 `devMode=true`） |

## 不做（店主口径）

- ❌ 界面上的开关面板 / 设置页配置；
- ❌ 运行时配置文件 / 新增路由接口 / fleet 下发通道；
- ❌ 拆独立插件包。

## 落地与验证

1. `config.ts` 重构（上述结构）+ 引擎数据化（清单表 + 按配置过滤执行）。
2. 测试：
   - 清单完备性守卫：15 项 id 全覆盖（2026-09-30 追加 `imSessionRows`）、引擎无漏接；
   - 过滤行为：以不同配置快照验证"启用集 → 各机制输出"（纯函数层）；
   - 既有测试保持全绿。
3. 本地活体验证：默认全遮（与现状一致）→ `master=false` 全开 → 单项回开（CSS / DOM / 官方门 / 座位 四类各挑一项）。
4. 文档同步：`AGENTS.md` / 文件头注释中 `devMode` 的表述随迁。
5. 发版 `3.1.0-lxy.13`（照旧单独拍板）。

## 回开流程（示例）

- 回开手机端「文件浏览」按钮：`items.mobileNavFiles: false` → `pnpm build` → 发版滚动；
- 整体放开某个实例：该实例构建 `mask.master: false`。

## 落地记录（2026-09-29）

已按本稿落地：`config.ts`（`mask.master` + `mask.items` 15 项，`devMode` 退役）、
`deployment-mode.ts`（`MASK_ITEM_TITLES` 清单与 `CSS_RULES_BY_ITEM`，各执行器按项过滤：
CSS 首帧 / DOM pass 与观察器 / 官方 `developerTools` 门）、`index.tsx`（模型座位按项注册）。
守卫：`tests/brand-rebrand.test.ts` 对账 `mask.items` ↔ `MASK_ITEM_TITLES` 并锁定默认全遮。

**2026-09-30 追加一项**：`imSessionRows` —— IM 桥接会话行（dsh-im「Matrix · …」通道会话不在客户工作台
露出；店主口径：聊天在 IM 侧，工作台里再出现 = 多余）。锚点 = dsh-im 图标插件的稳定 marker
（`data-dsh-im-session-channel`）+ 通道标题前缀族兜底；CSS（`:has`，重渲染零闪烁）与 DOM pass（前缀
兜底）双路。本地实机注入验证（文本命中 / marker 命中 / 对照行）全过，随 `3.1.0-lxy.15` 发版。

实机四步验证（本地 0.1.7-rc.2，桌面 + 触屏仿真）：
1. **默认全遮**：与改造前完全一致（用量胶囊/设置入口/菜单「模型」行/文件浏览按钮均遮蔽，
   首帧样式标签在位，自动刷新已武装）；
2. **单项回开**：`mobileNavFiles:false` + `turnUsage:false` → 该两项恢复（按钮 36×36 可见），
   其余保持遮蔽；
3. **总开关关**：`master:false` → 全部恢复、样式标签与自动刷新均不再安装；
4. **还原默认**：回 `master:true` + 全项 `true`，复检全遮。
