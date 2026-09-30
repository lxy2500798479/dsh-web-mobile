/**
 * 界面收口开关（编译期常量）——总开关 + 每项一配置，本项目唯一开关面。
 *
 * 改这里 → `pnpm build` → 本地重载 / 实例重打镜像即生效。默认 = 客户生产形态（全遮）。
 *
 * mask.master（总开关）:
 *  - `true`（默认，客户形态）：按 mask.items 逐项遮蔽下列入口；
 *  - `false`（开发/管理形态）：全部恢复官方原貌（= 原 devMode: true 的语义，含官方门打开）。
 *
 * mask.items（逐项开关；语义：true = 遮蔽该处，false = 该处恢复显示）:
 *  - devtools         轨迹 / 本轮代码差异 / 预设切换（宿主官方 ui-settings.developerTools 门同步）
 *  - modelSeat        模型选择座位（入口 slot 遮蔽）
 *  - seatSettings     设置入口（[data-slot="sidebar.settings"]）
 *  - rowPlugins       面板行「插件」
 *  - rowBrowser       面板行「浏览器」
 *  - mobileNavFiles   移动壳「文件浏览」按钮
 *  - headerPresetChip 会话头部预设 chip「标准模式」
 *  - browserDesktop   侧栏「浏览器桌面」入口（文案指纹）
 *  - menuModel        触发候选菜单（+ / 斜杠）「模型」行（文案指纹）
 *  - welcomeDialog    「内测声明」弹窗（CSS 首帧 + 摘 inert）
 *  - openInApp        「用文件管理器打开」整族（[data-open-target]）
 *  - twinDesk         「分身工作台」按钮
 *  - terminalCard     「新建终端」入口卡
 *  - turnUsage        每轮动作行「本轮用量」胶囊
 *  - imSessionRows    IM 桥接会话行（dsh-im「Matrix · …」等通道会话；侧栏列表/搜索结果不露出
 *                     ——2026-09-30 店主口径：聊天在 IM 侧，工作台里再出现 = 多余）
 *  - menuExtras       触发候选菜单（+ / 斜杠）里「文件 / 目标 / 计划」以外的命令行
 *                     （2026-09-30 店主口径：➕ 里只留这三项，反馈/压缩/权限/下载日志等一律不露出；
 *                     技能与 @ 引用来源的行不受影响）
 *  - permissionChip   composer 权限胶囊（访问模式；客户形态默认已是完全权限，选择器不再需要
 *                     ——2026-09-30 店主口径：把这个去掉，默认就是完全权限）
 *  - headerMore       会话头部右上角「更多操作」(⋯) 按钮（宿主 session-log-export 的
 *                     `header.more`；点开只有「下载 Session 日志 / 反馈」两项，客户形态不露出
 *                     ——2026-09-30 店主口径）
 *
 * 设计取舍（2026-09-29 开关化，店主口径「开关是代码层面的，不是配置到界面」）：
 * 一个总开关 + 每项一个配置；引擎（effects/deployment-mode.ts、index.tsx 座位注册）
 * 按本配置过滤执行——回开某项改一行即可，不再翻多个文件改代码。
 * 守卫：tests/brand-rebrand.test.ts 对账 mask.items ↔ 引擎清单（MASK_ITEM_TITLES），
 * 并锁定默认全遮（行为零变化）。id 增删或语义变更时两处一起改。
 *
 * 回开示例：`mobileNavFiles: false` → build → 发版滚动 ⇒ 手机端「文件浏览」按钮回来。
 */
export declare const config: {
    readonly mask: {
        /** 总开关：true = 客户形态（按 items 遮蔽）；false = 全部恢复官方原貌。 */
        readonly master: true;
        /** 逐项遮蔽开关：true = 遮蔽；false = 该处恢复显示。 */
        readonly items: {
            readonly devtools: true;
            readonly modelSeat: true;
            readonly seatSettings: true;
            readonly rowPlugins: true;
            readonly rowBrowser: true;
            readonly mobileNavFiles: true;
            readonly headerPresetChip: true;
            readonly browserDesktop: true;
            readonly menuModel: true;
            readonly welcomeDialog: true;
            readonly openInApp: true;
            readonly twinDesk: true;
            readonly terminalCard: true;
            readonly turnUsage: true;
            readonly imSessionRows: true;
            readonly menuExtras: true;
            readonly permissionChip: true;
            readonly headerMore: true;
        };
    };
};
/** 界面收口项 id（= mask.items 的键；引擎清单 MASK_ITEM_TITLES 必须与之逐项对齐）。 */
export type MaskItemId = keyof typeof config.mask.items;
/** 该项的遮蔽当前是否生效（总开关 + 逐项都开才算）。 */
export declare function maskEnabled(id: MaskItemId): boolean;
//# sourceMappingURL=config.d.ts.map