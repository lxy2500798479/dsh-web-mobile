/**
 * 账号行 / 退出登录 / 修改密码（客户线，2026-09-29）——门户环境的身份、退出与
 * 改密数据面。
 *
 * 客户入口是门户（wm.10rig.com），登录界面已与工作台合并成单一入口
 * （门户 2026-09-29 改造）：页面上不再有任何退出/换账号入口，而 dsh 实例
 * 自身没有账号体系——身份与退出都在门户侧。本模块只做三件事，全部走同源
 * 相对路径（应用页与门户同源，无 CORS、无跨域）：
 *  - `fetchPortalAccount()`：`GET /__portal/api/me` → 展示用账号名；
 *    非门户环境（直连实例/内网实验实例）该路径不可达或非 JSON → null →
 *    整个账号行不渲染（裸实例与旧部署零副作用）。
 *  - `requestLogout()`：`POST /logout`（门户清会话 + 过期 cookie），调用方
 *    随后 `location.replace('/')` 落回登录卡片（单一入口语义，见门户
 *    docs/portal-auth.md）。
 *  - `requestPasswordChange()`：`POST /__portal/api/password`（门户旧密码
 *    先验 → 重置 → **原地轮换会话**，响应 Set-Cookie 即为新会话——改密后
 *    用户无感保持登录（2026-09-29 晚店主口径），不需要重新登录）。
 *
 * 纯函数（accountLocalpart / parsePortalAccount / avatarInitial /
 * validatePasswordForm）与网络函数分离，前者由 tests/brand-rebrand.test.ts
 * 单测（新测试文件受 AGENTS.md 文件数契约约束，故并入）；fetch 可注入，
 * 便于测试驱动。
 */

/** 门户身份端点（同源；非门户环境不可达）。 */
export const PORTAL_ME_PATH = '/__portal/api/me'

/** 门户退出端点（POST；应答清除会话 cookie 并 303 回 `/`）。 */
export const PORTAL_LOGOUT_PATH = '/logout'

/** 账号行的可用身份：展示用账号名（Matrix localpart）+ 名册姓名（可选）。 */
export interface PortalAccount {
  readonly username: string
  /** 名册姓名（门户 Member.displayName，如「李六兵」）；缺名册/未填 = null。 */
  readonly displayName: string | null
}

/**
 * 从 Matrix 全名（`@sbqy01:im.10rig.com`）取展示用 localpart；裸账号原样
 * 返回。空/畸形输入返回 null——调用方据此隐藏整个账号行，绝不渲染半截 UI，
 * 也不把技术 id（`@…:…` 全名）暴露给客户。
 */
export function accountLocalpart(raw: string): string | null {
  const trimmed = raw.trim()
  const body = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  const local = (body.split(':', 1)[0] ?? '').trim()
  return local.length > 0 ? local : null
}

/**
 * 校验 `GET /__portal/api/me` 应答；不合形（未登录 ok:false、旧门户、
 * 中间层 HTML）一律 null。`displayName` 可选：非字符串/空白 = null
 * （客户端回落 localpart，旧门户应答天然兼容）。
 */
export function parsePortalAccount(value: unknown): PortalAccount | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (record.ok !== true || typeof record.account !== 'string') return null
  const username = accountLocalpart(record.account)
  if (username === null) return null
  const rawName = typeof record.displayName === 'string' ? record.displayName.trim() : ''
  return { username, displayName: rawName.length > 0 ? rawName : null }
}

/** 账号行的展示名：名册姓名（displayName）优先，缺省回落 localpart。 */
export function accountDisplayName(account: PortalAccount): string {
  return account.displayName ?? account.username
}

/** 头像首字：展示名首字符大写（数字/汉字原样）；空串退化 `?`。 */
export function avatarInitial(username: string): string {
  return (username.charAt(0) || '?').toUpperCase()
}

/**
 * 拉取门户身份。任何失败（404/401/HTML 应答/网络错误）一律 null——账号行
 * 在这些环境里必须整块消失，而不是显示残件。
 */
export async function fetchPortalAccount(fetcher: typeof fetch = fetch): Promise<PortalAccount | null> {
  try {
    const response = await fetcher(PORTAL_ME_PATH, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) return null
    return parsePortalAccount(await response.json() as unknown)
  } catch {
    return null
  }
}

/**
 * 门户退出（清会话 + 过期 cookie）。返回请求是否送达门户——false 时调用方
 * 走表单兜底导航（离线/网关抖动下 fetch 失败但真实表单 POST 仍可能送达）。
 * 会话 cookie 的清理由门户应答携带，本函数不关心应答体。
 */
export async function requestLogout(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    await fetcher(PORTAL_LOGOUT_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    })
    return true
  } catch {
    return false
  }
}

/** 门户改密端点（POST JSON；旧密码先验 → 重置 → 原地轮换会话）。 */
export const PORTAL_PASSWORD_PATH = '/__portal/api/password'

/** 改密表单校验问题；全部合法时 null。与门户端同一口径（≥8 位）。 */
export type PasswordFormProblem = 'fill' | 'short' | 'mismatch'

/** 校验改密三格（纯函数，供单测）：非空 / 新密码 ≥8 / 两次一致。 */
export function validatePasswordForm(input: {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}): PasswordFormProblem | null {
  if (input.oldPassword.length === 0 || input.newPassword.length === 0 || input.confirmPassword.length === 0) {
    return 'fill'
  }
  if (input.newPassword.length < 8) return 'short'
  if (input.newPassword !== input.confirmPassword) return 'mismatch'
  return null
}

/** 改密结果：ok 时门户已轮换会话（同一响应 Set-Cookie），无需重新登录。 */
export interface PasswordChangeResult {
  readonly ok: boolean
  /** 失败时门户给的人话；成功时 null。 */
  readonly message: string | null
}

/**
 * 提交改密。成功时门户在同一响应里轮换会话（新 dsh_portal cookie + 新实例
 * 凭据），用户无感保持登录、不中断（2026-09-29 晚店主口径「不要退出去，
 * 直接用新密码刷新 token 无感再次登录」——轮换在门户侧完成；若门户降级
 * 未轮换，旧会话也照旧有效，同样不中断）。失败返回门户人话。
 */
export async function requestPasswordChange(
  username: string,
  oldPassword: string,
  newPassword: string,
  fetcher: typeof fetch = fetch,
): Promise<PasswordChangeResult> {
  try {
    const response = await fetcher(PORTAL_PASSWORD_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ username, oldPassword, newPassword }),
    })
    const body = (await response.json().catch(() => null)) as { ok?: unknown; message?: unknown } | null
    if (body !== null && body.ok === true) return { ok: true, message: null }
    const message =
      body !== null && typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : '修改失败，请重试'
    return { ok: false, message }
  } catch {
    return { ok: false, message: '网络异常，请稍后重试' }
  }
}
