import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type MaskItemId } from '../config.ts';
/**
 * 部署形态（2026-09-28，中贝通信生产形态）：按 `config.mask`（总开关 + 逐项）收/放入口。
 * 2026-09-29 开关化：清单数据化为「每项一配置」——各执行器按项过滤（清单本体在
 * config.ts），本文件只做机制；回开/追加某项 = 改 `config.mask.items` 一行，
 * 守卫测试（tests/brand-rebrand.test.ts）对账两处清单与默认全遮。
 *
 * 两条路线：
 *  1) 宿主官方门 —— 轨迹 / 本轮代码差异 / 预设切换 由宿主 `ui-settings` 命名空间的
 *     `developerTools` 偏好门控（宿主默认 true = 全开）。这里在启动后把它同步成
 *     `mask.devtools` 项的语义值：官方各自渲染器自行隐藏，零 DOM 侵入。旧宿主（rc.6
 *     线）没有 `configForms` 服务 → inject 回调不触发，整段惰性，不报错。
 *  2) DOM 遮蔽 —— 设置 / 浏览器 / 插件 面板行没有官方门，按行隐藏：
 *     设置 = `[data-slot="sidebar.settings"]` 座位；浏览器/插件 = 侧栏面板行
 *     （`button[class*="panelRow"]`，按 aria-label 命中，zh/en 双语，未命中静默）。
 *
 * 全部改动幂等、随整块重挂自动重放；不做断点门控（产品形态与视口无关）。
 *
 * 2026-09-29 扩展（店主拍板「用户用不上」，客户形态一并遮蔽）：
 *  ① 移动壳「文件浏览」按钮（`data-mobile-nav="files"`，右上角文件夹图标）；
 *  ② 会话头部的预设 chip（`conversation.session.header.actions` 槽里的「标准模式」
 *     标签；槽容器 display:contents 无盒，遮蔽其 span 子元素）；
 *  ③ 侧栏页脚「浏览器桌面」入口（@runzhliu/dsh-browser-desktop，按文案指纹 zh/en 匹配）；
 *  ④ 「内测声明」弹窗（宿主 settings-models 的 welcome-notice 步骤；远程浏览器走
 *     memory-mode 每次载入必弹且遮罩拦点击）——**处理方式 = 使其对用户不可见且不阻塞**：
 *     ① 模块求值即注入 CSS（早于设置壳渲染 ⇒ 从未被绘制，无闪现）把该 overlay 整体
 *        `display:none`（:has 选择器按 aria-label 命中，`body > div:not(#root)` 兜底防误伤 App 根）；
 *     ② 摘掉应用根 #root 的 inert（未确认期间宿主把它置 inert，真实触摸会被整个吞掉；
 *        程序化 click 不受影响，曾据此误判过「无阻塞」）；
 *     ③ **不代点**（店主口径：不让用户看到这个窗口即可，不触发其确认动作）；
 *     ④ 观察器盯住 inert 属性，宿主重加即再摘。
 *  ⑤ ui-open-in-app 的「在文件夹中打开」控件（预览页头 + 交付卡片；容器里没有
 *     可用的本机文件管理器，宿主因实例开了 DSH_DESKTOP_ENABLED 而渲染它，客户
 *     点它没有任何结果——2026-09-29 店主实机「点了也没有用」）。CSS 首帧遮蔽；
 *     交付卡片的下载位由本插件 DeliverableDownloadButton 补上。
 * 三者只在手机壳 / 会话 active 期渲染，桌面视口天然不命中（死规则）。
 *
 * 2026-09-30 扩展（店主实机反馈，客户形态再收三处；CSS 首帧遮蔽）：
 *  ① 会话头部「分身工作台」按钮（dsh-matrix-agent 注入的客户端入口）：客户实例
 *     上该入口读不到数据（空壳），店主口径 = 直接隐藏；
 *  ② 右侧栏「开始」页「新建终端」入口卡（官方 ui-sidebar-terminal 引导卡）：
 *     客户形态只保留其上的「工作区文件」卡；
 *  ③ ui-open-in-app 的「用文件管理器打开」会话头部控件（`directory` 取值）：
 *     容器形态没有可用的本机文件管理器——原 `file` 单值遮蔽扩为整族 `[data-open-target]`。
 *
 * 2026-09-29（深夜·续）客户形态再收两处（店主实机截图口径）：
 *  ① 每轮动作行的「本轮用量」胶囊（dsh-client-ui-chat TurnUsagePanel；图标 + 「用量
 *     N tok」）——动作行只保留 复制 / 点赞 / 点踩 / 在新对话分支 四颗。CSS 首帧遮蔽；
 *     类名 = 官方包构建哈希 `Q51KRG_`，宿主升级需回来对账；
 *  ② 触发候选菜单（+ / 斜杠）里的「模型」命令行（dsh-client-ui-model-selection，
 *     描述「选择本会话使用的模型」）——客户不在此处切模型。DOM 遮蔽按描述指纹
 *     命中（isModelCommandRow，zh/en），菜单每次新开由观察器重放。
 *
 * 2026-09-30 扩展（客户线）：**页面版本跟随（自动刷新）** —— 见文件尾同名分节。
 * 宿主把「全部插件 bundle 的内容修订」内联成 `window.__DSH_BOOT__` 的 rev 进
 * index HTML；客户把站点装到主屏幕后长期不刷新页面，发版（插件/镜像）后旧页面与
 * 服务端新代码混用会出怪状（消息不出回复等）。本机制周期性 no-store 取回文档根、
 * 抽同一 rev 与本地页面比对，不同即自动 `location.reload()` 一次，把旧页面收敛到
 * 新版。仅客户形态安装（开发调试形态保留手动刷新/热重载工作流）。
 */
/** 逐项遮蔽清单元数据（id 对齐 config.mask.items；守卫测试比对两者）。 */
export declare const MASK_ITEM_TITLES: Record<MaskItemId, string>;
/** 该按钮是否属于「浏览器桌面」入口（纯函数，供单测）。 */
export declare function isBrowserDesktopLabel(label: string | null | undefined): boolean;
/** 该对话框是否属于「内测声明」弹窗（纯函数，供单测）。 */
export declare function isWelcomeNoticeLabel(label: string | null | undefined): boolean;
/** 该菜单行是否属于「模型」命令（纯函数，供单测）。 */
export declare function isModelCommandRow(text: string | null | undefined): boolean;
/** 该标题是否属于 IM 桥接会话（纯函数，供单测）：精确前缀 + 前缀后必须有非空标题。 */
export declare function isImSessionTitle(text: string | null | undefined): boolean;
/** 面板行 → 收口项 id（纯函数，供单测；非收口行返回 null）。 */
export declare function panelRowMaskId(label: string | null | undefined): MaskItemId | null;
/**
 * 对 root 做一遍客户形态遮蔽（按 config.mask 逐项过滤：设置入口 + 面板行 +
 * 文件浏览按钮 / 预设 chip / 浏览器桌面入口 / 触发候选菜单「模型」行 / 内测声明弹窗）。
 * @param root - 搜索根（挂载时全量，之后按新增子树增量）。
 * @returns 是否发生了改动。
 */
export declare function applyCustomerMode(root: ParentNode): boolean;
/**
 * 安装部署形态（全视口生效）。
 * @param ctx - client 根上下文。
 */
export declare function installDeploymentMode(ctx: ClientContext): void;
/** 同一目标版本最多自动刷新的次数（防刷新循环）。 */
export declare const AUTO_RELOAD_MAX_PER_TARGET = 2;
/** 记账键（sessionStorage：跨刷新保留、随标签页生灭）。 */
export declare const AUTO_RELOAD_STORAGE_KEY = "dsh-web-mobile:auto-reload";
/** 自动刷新记账：目标版本（服务端启动图 rev）与已尝试的刷新次数。 */
export interface AutoReloadState {
    target: string;
    attempts: number;
}
/**
 * 读一个 `__DSH_BOOT__` 候选值的启动图 rev。形态不符（旧宿主/异常页）返回 null。
 * @param value - 任意 `__DSH_BOOT__` 候选值。
 * @returns rev 字符串，或 null。
 */
export declare function bootRevOf(value: unknown): string | null;
/**
 * 从宿主渲染的 index HTML 文本里抽启动图 rev（内联行
 * `globalThis["__DSH_BOOT__"] = {…}`；宿主对 JSON 值做过 `\u003c` 转义，不含裸
 * `</script`）。抽不到（旧宿主格式/登录页/中间层改写）返回 null，调用方静默跳过。
 * @param html - index 响应文本。
 * @returns rev 字符串，或 null。
 */
export declare function bootRevInHtml(html: string): string | null;
/**
 * 该目标版本是否还允许自动刷新（同目标已刷满上限则放弃）。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则允许）。
 * @returns 是否允许刷新。
 */
export declare function autoReloadAllowed(fresh: string, state: AutoReloadState | null): boolean;
/**
 * 记一次「即将发生」的刷新：换目标从 1 起算，同目标累加。
 * @param fresh - 服务端当前 rev。
 * @param state - 记账状态（无则新建）。
 * @returns 新记账状态。
 */
export declare function autoReloadNextState(fresh: string, state: AutoReloadState | null): AutoReloadState;
/** 焦点是否在输入类控件上（正在打字，刷新应推迟而不是打断）。 */
export declare function isEditableFocused(doc: Document): boolean;
/**
 * 安装页面版本跟随（自动刷新；全视口生效——桌面标签页同样会挂着旧版本）。
 * @param ctx - client 根上下文。
 */
export declare function installAutoReload(ctx: ClientContext): void;
//# sourceMappingURL=deployment-mode.d.ts.map