import { useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../i18n/locales.ts'
import { fetchPortalAccount, requestLogout, avatarInitial, type PortalAccount } from './account-card.ts'

/**
 * 账号行（客户线，2026-09-29）——侧栏/抽屉底部的「圆形头像 + 账号名」，点击
 * 弹出单个「退出登录」按钮（不显示会话有效期：2026-09-29 用户口径，能退出
 * 就行）。
 *
 * 为什么在这里：登录界面与工作台合并成单一入口后（门户 2026-09-29 改造），
 * 页面上不再有任何退出/换账号入口；dsh 实例自身无账号体系，身份与退出都在
 * 门户侧。本组件占 `sidebar.footer.action` 槽（order 1：会话日志 5 与用量
 * 徽标 10 之上、远程图标行之下）；数据走同源 `GET /__portal/api/me`、退出走
 * `POST /logout`（机制与边界见 account-card.ts）。拉不到身份（非门户环境/
 * 未登录）时整块不渲染。
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
  const rootRef = useRef<HTMLDivElement | null>(null)

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

  if (account === null) return null

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

  return (
    <div data-mobile-nav="account" ref={rootRef}>
      <button
        type="button"
        data-mobile-nav="account-button"
        aria-label={t('accountLabel', { name: account.username })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span data-mobile-nav="account-avatar" aria-hidden="true">{avatarInitial(account.username)}</span>
        <span data-mobile-nav="account-name">{account.username}</span>
      </button>
      {menuOpen ? (
        <div data-mobile-nav="account-menu" role="menu">
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
    </div>
  )
}
