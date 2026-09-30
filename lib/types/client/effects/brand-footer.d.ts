import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * 会话底部署名行（2026-09-30 店主口径）：客户形态在**会话最下面**显示
 * 「拾贝起源 技术支持」。
 *
 * 位置：宿主 composerStack（`[class*="_composerStack"]`）的**最后一个子节点之后** ——
 * 实测该容器自卡片（输入框）+ dock（轮/步/tok 状态行）之后还有 32px 下内边距，注入的这行
 * 正好落在状态行之下、贴着视口底。
 *
 * 门控：**全宽度**（2026-09-30 店主口径：web 端页面与手机端都要有）。这是仓库「桌面端
 * no-op」契约的**第二个有意例外**（第一个是账号行/退出登录），已在 AGENTS.md 登记。
 *
 * 幂等：已存在同名标记就直接返回；React 重挂 composerStack 时由 `document.body` 的
 * childList 观察器补齐（微任务早于被动 effect，首帧不会漏）。卸载清干净。
 */
export declare function installBrandFooter(ctx: ClientContext): void;
//# sourceMappingURL=brand-footer.d.ts.map