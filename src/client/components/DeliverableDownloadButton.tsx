import { useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconDownload } from '../core/icon-compat.ts'
import { createBrowserEnvironment, deliverFile, type FileDeliveryEnvironment } from '../core/file-download.ts'
import { downloadToastFor, showToast } from '../core/download-feedback.ts'
import { NS } from '../i18n/locales.ts'

/**
 * 聊天内「交付卡片」的下载控件（客户线，2026-09-29 第二版）。
 *
 * 店主实机反馈：卡片右侧那个宿主控件（ui-open-in-app 的「在文件夹中打开/应用
 * 打开」；实例开了 DSH_DESKTOP_ENABLED，宿主以为有桌面，于是它被渲染出来了）
 * 在容器形态里点了没有任何结果——客户想要的直接动作是「把文件拿走」。本控件占
 * 宿主为第三方预留的 `deliverables.file.actions` 槽：客户形态下宿主那个控件由
 * CSS 遮蔽（effects/deployment-mode.ts），此处补上「下载」。预览不受影响——
 * 卡片整体仍是预览覆盖层（宿主 cardPreview）。
 *
 * 路径来源：槽的 owner 只给会话内事件坐标（actionUrl），没有绝对路径；卡片自身
 * 的预览覆盖层把 resolveWorkspacePath(cwd, file.path) 写在 title 上，点击时从
 * 所属卡片的 DOM 读——读不到或不像绝对路径就报「下载失败」，绝不猜路径。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 交付卡片动作区（宿主 ui-deliverables；owner 字段不使用，只借位置）。 */
    'deliverables.file.actions': {
      kind: 'list'
      scope: 'session'
      owner: {
        readonly actionUrl: string
        readonly available: boolean
        readonly pending: boolean
        readonly onAction: (action: 'open' | 'reveal', application?: string) => Promise<unknown>
      }
    }
  }
}

/** 失败文案 4s 后回落图标（与页头控件同）。 */
const FAILURE_LABEL_RESET_MS = 4000

/** 控件的本地阶段：busy 期间禁用；失败态短暂显示文案后回落到图标。 */
type CardPhase = { readonly kind: 'idle' | 'busy' | 'failed' }

/**
 * 读一张交付卡片上记录的宿主绝对路径（卡片预览覆盖层的 title）。
 * @param card - 卡片根节点（找不到时为 null）。
 * @returns 绝对路径，或 null（无卡片 / 无 title / 形状不像绝对路径）。
 */
export function presentedPathOf(card: Element | null): string | null {
  if (card === null) return null
  const overlay = card.querySelector<HTMLElement>('button[class*="cardPreview"]')
    ?? card.querySelector<HTMLElement>('button[title]')
  const title = overlay?.getAttribute('title') ?? null
  if (title === null || title === '') return null
  return title.startsWith('/') || /^[A-Za-z]:[\\/]/.test(title) ? title : null
}

/** 交付卡片的紧凑下载控件。 */
export function DeliverableDownloadButton(props: PropsRuntime<'deliverables.file.actions'> & PropsLocale<typeof NS>) {
  const { t } = props
  const anchor = useRef<HTMLButtonElement | null>(null)
  const [phase, setPhase] = useState<CardPhase>({ kind: 'idle' })
  const environment = useRef<FileDeliveryEnvironment | null>(null)
  const resetTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current)
  }, [])
  const fail = (): void => {
    setPhase({ kind: 'failed' })
    if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => { setPhase({ kind: 'idle' }) }, FAILURE_LABEL_RESET_MS)
  }
  const start = (): void => {
    if (phase.kind === 'busy') return
    const path = presentedPathOf(anchor.current?.closest('[data-presented-file]') ?? null)
    if (path === null) {
      fail()
      return
    }
    setPhase({ kind: 'busy' })
    environment.current ??= createBrowserEnvironment()
    void deliverFile(path, environment.current).then((outcome) => {
      if (outcome.kind === 'failed') {
        fail()
        return
      }
      setPhase({ kind: 'idle' })
      const feedback = downloadToastFor(outcome, path)
      if (feedback !== null) showToast(t(feedback.key, { name: feedback.name }))
    })
  }
  const label = phase.kind === 'failed' ? t('downloadFailed') : t('download')
  return (
    <button
      ref={anchor}
      type="button"
      data-mobile-nav="download-card"
      data-state={phase.kind}
      aria-label={label}
      title={label}
      aria-busy={phase.kind === 'busy' ? true : undefined}
      disabled={phase.kind === 'busy'}
      onClick={start}
    >
      <IconDownload size={16} />
    </button>
  )
}
