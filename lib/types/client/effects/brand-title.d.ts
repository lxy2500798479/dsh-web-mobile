import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * 浏览器标签标题换牌（2026-09-29，拾贝起源部署）。
 *
 * 标题不在 slot 系统内：宿主发布构建把 `DSH_CLIENT_TITLE` 烘焙进客户端包
 * （dsh-client-ui-brand-official README：「浏览器标题是构建环境的事」），运行时由
 * ui-layout 的 DocumentTitle 持续写入 document.title —— 裸产品名，或
 * 「`<会话名> — <产品名>`」（会话切换与流式标题更新都会重写）。运行时不读环境
 * 变量、也没有品牌配置面 ⇒ 与首屏标语同路：客户端插件做 DOM 覆盖。
 *
 * 机制：观察 `<title>` 子树的文本变化，把宿主的「DeepSeek Harness」替换为品牌名
 * （保留「会话名 — 」前缀）；写入自身也会触发观察回调，但替换幂等（无宿主要素
 * 即 no-op），不会自激。不做移动断点门控：品牌应与视口无关地一致。
 *
 * 边界：曾评估 nginx `sub_filter` 在边缘替换（不需要插件在场即可生效），
 * 2026-09-29 按用户口径回退 —— 品牌/业务逻辑不放网关写死，归项目（本插件）。
 */
export declare function installBrandTitle(ctx: ClientContext): void;
//# sourceMappingURL=brand-title.d.ts.map