/**
 * 账号行 / 退出登录（客户线，2026-09-29）——门户环境的身份与退出数据面。
 *
 * 客户入口是门户（wm.10rig.com），登录界面已与工作台合并成单一入口
 * （门户 2026-09-29 改造）：页面上不再有任何退出/换账号入口，而 dsh 实例
 * 自身没有账号体系——身份与退出都在门户侧。本模块只做两件事，全部走同源
 * 相对路径（应用页与门户同源，无 CORS、无跨域）：
 *  - `fetchPortalAccount()`：`GET /__portal/api/me` → 展示用账号名；
 *    非门户环境（直连实例/内网实验实例）该路径不可达或非 JSON → null →
 *    整个账号行不渲染（裸实例与旧部署零副作用）。
 *  - `requestLogout()`：`POST /logout`（门户清会话 + 过期 cookie），调用方
 *    随后 `location.replace('/')` 落回登录卡片（单一入口语义，见门户
 *    docs/portal-auth.md）。
 *
 * 纯函数（accountLocalpart / parsePortalAccount / avatarInitial）与网络函数
 * 分离，前者由 tests/brand-rebrand.test.ts 单测（新测试文件受 AGENTS.md
 * 文件数契约约束，故并入）；fetch 可注入，便于测试驱动。
 */
/** 门户身份端点（同源；非门户环境不可达）。 */
export declare const PORTAL_ME_PATH = "/__portal/api/me";
/** 门户退出端点（POST；应答清除会话 cookie 并 303 回 `/`）。 */
export declare const PORTAL_LOGOUT_PATH = "/logout";
/** 账号行的可用身份：展示用账号名（Matrix localpart，如 sbqy01）。 */
export interface PortalAccount {
    readonly username: string;
}
/**
 * 从 Matrix 全名（`@sbqy01:im.10rig.com`）取展示用 localpart；裸账号原样
 * 返回。空/畸形输入返回 null——调用方据此隐藏整个账号行，绝不渲染半截 UI，
 * 也不把技术 id（`@…:…` 全名）暴露给客户。
 */
export declare function accountLocalpart(raw: string): string | null;
/**
 * 校验 `GET /__portal/api/me` 应答；不合形（未登录 ok:false、旧门户、
 * 中间层 HTML）一律 null。
 */
export declare function parsePortalAccount(value: unknown): PortalAccount | null;
/** 头像首字：localpart 首字符大写（数字原样）；空串退化 `?`。 */
export declare function avatarInitial(username: string): string;
/**
 * 拉取门户身份。任何失败（404/401/HTML 应答/网络错误）一律 null——账号行
 * 在这些环境里必须整块消失，而不是显示残件。
 */
export declare function fetchPortalAccount(fetcher?: typeof fetch): Promise<PortalAccount | null>;
/**
 * 门户退出（清会话 + 过期 cookie）。返回请求是否送达门户——false 时调用方
 * 走表单兜底导航（离线/网关抖动下 fetch 失败但真实表单 POST 仍可能送达）。
 * 会话 cookie 的清理由门户应答携带，本函数不关心应答体。
 */
export declare function requestLogout(fetcher?: typeof fetch): Promise<boolean>;
//# sourceMappingURL=account-card.d.ts.map