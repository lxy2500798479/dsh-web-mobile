import { useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../i18n/locales.ts'
import {
  accountDisplayName,
  avatarInitial,
  fetchPortalAccount,
  requestLogout,
  requestPasswordChange,
  validatePasswordForm,
  type PortalAccount,
} from './account-card.ts'

/**
 * 账号行（客户线，2026-09-29）——侧栏/抽屉底部的「圆形头像 + 账号名」，点击
 * 弹出「修改密码 / 退出登录」两项（不显示会话有效期：2026-09-29 用户口径，
 * 能退出就行）。
 *
 * 修改密码（2026-09-29 晚，店主口径）：菜单项 `account-password` → 居中弹窗
 * （`account-password-overlay` 遮罩 + `account-password-dialog` 卡片），三格
 * 输入（当前密码 / 新密码 ≥8 位 / 确认新密码），提交走同源
 * `POST /__portal/api/password`。门户在改密成功后**原地轮换会话**
 * （响应 Set-Cookie 换新的 dsh_portal 会话与实例凭据）——用户完全不中断、
 * 不需要重新登录；门户降级未轮换时旧会话也照旧有效。校验与门户同口径
 * （非空 / ≥8 / 两次一致），文案全中文化（错误/提示皆人话）。
 *
 * 为什么在这里：登录界面与工作台合并成单一入口后（门户 2026-09-29 改造），
 * 页面上不再有任何退出/换账号入口；dsh 实例自身无账号体系，身份与退出都在
 * 门户侧。本组件占 `sidebar.footer.action` 槽（order 1：会话日志 5 与用量
 * 徽标 10 之上、远程图标行之下）；数据走同源 `GET /__portal/api/me`、退出走
 * `POST /logout`（机制与边界见 account-card.ts）。拉不到身份（非门户环境/
 * 未登录）时整块不渲染。
 *
 * 展示名（2026-09-30）：门户 `/__portal/api/me` 的 `displayName`（名册姓名，
 * 如「李六兵」）优先，缺名册回落 localpart；密码接口只用 username。
 * 侧栏折叠（宿主 frame 的 `data-sidebar-collapsed="true"`，56px 图标轨道）时
 * 只留头像——名字隐藏与菜单溢出释放规则在 base.css.ts（轨道里放不下，实测
 * 名字会把行撑到 87px 并左右溢出、菜单会被宿主列的 overflow:hidden 裁掉）。
 * 折叠规则只锚宿主原生的 data-sidebar-collapsed，不得用 [data-dsh-frame] /
 * [data-pane] 装饰锚——那是 @linxin666/dsh-web-all 注入的，客户实例没有
 * （2026-09-30 实例实测），靠它 = 规则在客户形态静默失效。
 *
 * 刻意跨宽度（桌面也渲染）：客户用电脑浏览器（鼠标指针）经门户访问时同样
 * 需要退出入口，所以标记 `account` 不在 misc.css.ts 的桌面遮蔽名单里——
 * 这是 README「桌面 no-op」承诺的唯一例外（2026-09-29 用户要求）。
 *
 * 退出路径：fetch POST /logout → 门户清会话 → `location.replace('/')` 回到
 * 登录卡片（不新增历史条目，与单一入口语义一致）；fetch 失败走表单兜底
 * 导航（离线/网关抖动也不卡死）。
 */
export function AccountCard({ t }: PropsLocale<typeof NS>) {
  const [account, setAccount] = useState<PortalAccount | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordDone, setPasswordDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const oldInputRef = useRef<HTMLInputElement | null>(null)

  // 拉一次身份即可：换账号必经整页重载（门户登录后 replace('/')），组件随页面重建。
  useEffect(() => {
    let cancelled = false
    void fetchPortalAccount().then((value) => {
      if (!cancelled) setAccount(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 菜单关闭手势：点外部或 Escape。capture 阶段监听，抽屉内其它守卫吞不掉。
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: Event): void => {
      const root = rootRef.current
      if (root !== null && event.target instanceof Node && !root.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [menuOpen])

  // 改密弹窗：打开时聚焦「当前密码」；Escape 关闭（提交中不关，防误触丢输入）。
  useEffect(() => {
    if (!passwordOpen) return
    oldInputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !submitting) setPasswordOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [passwordOpen, submitting])

  if (account === null) return null

  // 展示名：名册姓名（中文名）优先，缺省回落 localpart；密码接口只用 username。
  const label = accountDisplayName(account)

  const logout = (): void => {
    if (busy) return
    setBusy(true)
    void requestLogout().then((delivered) => {
      if (delivered) {
        window.location.replace('/')
        return
      }
      // 兜底：真实表单导航。门户在一次完整 POST 里清会话并 303 回 `/`。
      const form = document.createElement('form')
      form.method = 'post'
      form.action = '/logout'
      document.body.appendChild(form)
      form.submit()
    })
  }

  const openPassword = (): void => {
    setMenuOpen(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordDone(false)
    setSubmitting(false)
    setPasswordOpen(true)
  }

  const closePassword = (): void => {
    if (submitting) return
    setPasswordOpen(false)
  }

  const submitPassword = (): void => {
    if (submitting || passwordDone) return
    const problem = validatePasswordForm({ oldPassword, newPassword, confirmPassword })
    if (problem !== null) {
      setPasswordError(
        problem === 'fill' ? t('passwordFillAll') : problem === 'short' ? t('passwordTooShort') : t('passwordMismatch'),
      )
      return
    }
    setSubmitting(true)
    setPasswordError(null)
    void requestPasswordChange(account.username, oldPassword, newPassword).then((result) => {
      setSubmitting(false)
      if (!result.ok) {
        setPasswordError(result.message ?? t('passwordFailed'))
        return
      }
      // 无感：门户已在同一响应里轮换会话（Set-Cookie），不跳转、不刷新。
      setPasswordDone(true)
      window.setTimeout(() => {
        setPasswordOpen(false)
      }, 1400)
    })
  }

  return (
    <div data-mobile-nav="account" ref={rootRef}>
      <button
        type="button"
        data-mobile-nav="account-button"
        aria-label={t('accountLabel', { name: label })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span data-mobile-nav="account-avatar" aria-hidden="true">{avatarInitial(label)}</span>
        <span data-mobile-nav="account-name">{label}</span>
      </button>
      {menuOpen ? (
        <div data-mobile-nav="account-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            data-mobile-nav="account-password"
            onClick={openPassword}
          >
            {t('accountPassword')}
          </button>
          <button
            type="button"
            role="menuitem"
            data-mobile-nav="account-logout"
            disabled={busy}
            onClick={logout}
          >
            {busy ? t('loggingOut') : t('logout')}
          </button>
        </div>
      ) : null}
      {passwordOpen ? (
        <div
          data-mobile-nav="account-password-overlay"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closePassword()
          }}
        >
          <div
            data-mobile-nav="account-password-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t('passwordTitle')}
          >
            <h3>{t('passwordTitle')}</h3>
            <input
              ref={oldInputRef}
              data-mobile-nav="password-old"
              type="password"
              autoComplete="current-password"
              placeholder={t('passwordOld')}
              value={oldPassword}
              onChange={(event) => setOldPassword(event.currentTarget.value)}
            />
            <input
              data-mobile-nav="password-new"
              type="password"
              autoComplete="new-password"
              placeholder={t('passwordNew')}
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
            />
            <input
              data-mobile-nav="password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t('passwordConfirm')}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            />
            {passwordError !== null ? (
              <p data-mobile-nav="password-error" role="alert">{passwordError}</p>
            ) : null}
            {passwordDone ? (
              <p data-mobile-nav="password-updated" role="status">{t('passwordUpdated')}</p>
            ) : null}
            <div data-mobile-nav="password-actions">
              <button
                type="button"
                data-mobile-nav="password-cancel"
                disabled={submitting}
                onClick={closePassword}
              >
                {t('passwordCancel')}
              </button>
              <button
                type="button"
                data-mobile-nav="password-submit"
                disabled={submitting || passwordDone}
                onClick={submitPassword}
              >
                {submitting ? t('passwordSubmitting') : t('passwordSubmit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
