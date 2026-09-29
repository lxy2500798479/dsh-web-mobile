// The Files control must act on the surface the user actually has: the host's
// right sidebar when present (0.1.5 ships the workspace tree there), and only
// otherwise the third-party explorer marker. Regression this guards: the
// control toggled the explorer marker unconditionally, so on a host without
// dsh-web-ui-all it painted an icon that did nothing at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openFilesPanel, HOST_FILES_CLOSER, HOST_FILES_OPENER } from '../src/client/components/open-files-panel.ts'
import { deliverFile, fileDownloadRoute, fileNameFromPath, type FileDeliveryEnvironment } from '../src/client/core/file-download.ts'
import { downloadToastFor } from '../src/client/core/download-feedback.ts'

const openerDoc = (found: unknown) => ({ querySelector: (selector: string) => (selector === HOST_FILES_OPENER ? found : null) })
const bothDoc = (opener: unknown, closer: unknown) => ({ querySelector: (selector: string) => (selector === HOST_FILES_OPENER ? opener : selector === HOST_FILES_CLOSER ? closer : null) })

test('openFilesPanel: clicks the host right-sidebar opener when it exists', () => {
  let clicks = 0
  const frame = { removeAttribute: () => assert.fail('explorer fallback must not run'), setAttribute: () => assert.fail('explorer fallback must not run') }
  const opened = openFilesPanel(openerDoc({ click: () => { clicks += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(clicks, 1)
})

test('openFilesPanel: falls back to the explorer marker on hosts without it', () => {
  const calls: string[] = []
  const frame = {
    removeAttribute: (name: string) => calls.push('remove:' + name),
    setAttribute: (name: string) => calls.push('set:' + name),
  }
  const opened = openFilesPanel(openerDoc(null), frame)
  assert.equal(opened, false)
  assert.deepEqual(calls, ['remove:data-aionui-preview-open', 'set:data-aionui-explorer-open'])
})

test('openFilesPanel: no frame and no host opener is a no-op', () => {
  assert.equal(openFilesPanel(openerDoc(null), null), false)
})

test('openFilesPanel: a non-clickable match still falls back instead of throwing', () => {
  const calls: string[] = []
  const frame = { removeAttribute: () => calls.push('remove'), setAttribute: () => calls.push('set') }
  // Plain object (not an HTMLElement): no click() to call, so the fallback runs.
  assert.equal(openFilesPanel(openerDoc({}), frame), false)
  assert.deepEqual(calls, ['remove', 'set'])
})

// The host unmounts the opener while the panel is open, so a control keyed on
// the opener alone went dead exactly when the user had the panel already up.
test('openFilesPanel: uses the collapse control when the panel is already open', () => {
  let collapses = 0
  let opens = 0
  const frame = { removeAttribute: () => assert.fail('explorer fallback must not run'), setAttribute: () => assert.fail('explorer fallback must not run') }
  const opened = openFilesPanel(bothDoc(null, { click: () => { collapses += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(collapses, 1)
  assert.equal(opens, 0)
})

test('openFilesPanel: prefers the opener when both controls are present', () => {
  let collapses = 0
  let opens = 0
  const frame = { removeAttribute: () => assert.fail('explorer fallback must not run'), setAttribute: () => assert.fail('explorer fallback must not run') }
  const opened = openFilesPanel(bothDoc({ click: () => { opens += 1 } }, { click: () => { collapses += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(opens, 1)
  assert.equal(collapses, 0)
})

// The file-delivery core (src/client/core/file-download.ts) is the customer's
// only way to take a container file onto the device (2026-09-29 reports「文件没
// 有下载的渠道」/「文件大了就有问题」). The decision order is pinned with
// injected fakes: a HEAD probe first (its 404/413 become the user-facing
// labels before any bytes move), the share sheet for small iOS files, and the
// browser-native streamed download everywhere else — large files must never
// transit JavaScript memory, and a cancelled share stays a user decision.
const BLOB = new Blob(['payload'], { type: 'text/plain' })
const SMALL = 1024
const LARGE = 200 * 1024 * 1024

interface FakeOptions {
  readonly calls: string[]
  readonly headStatus?: number
  readonly headError?: boolean
  readonly size?: number | null
  readonly getStatus?: number
  readonly getError?: boolean
  readonly canShare?: boolean
  readonly shareError?: unknown
  readonly downloadError?: boolean
  readonly onShare?: (file: File) => void
}

const fakeEnvironment = (options: FakeOptions): FileDeliveryEnvironment => ({
  headFile: async () => {
    options.calls.push('head')
    if (options.headError === true) throw new TypeError('network down')
    if (options.headStatus !== undefined && options.headStatus !== 200) return { ok: false, status: options.headStatus }
    return { ok: true, size: options.size === undefined ? SMALL : options.size }
  },
  fetchBlob: async () => {
    options.calls.push('get')
    if (options.getError === true) throw new TypeError('network down')
    if (options.getStatus !== undefined && options.getStatus !== 200) return { ok: false, status: options.getStatus }
    return { ok: true, blob: BLOB }
  },
  canShareFiles: () => {
    options.calls.push('canShare')
    return options.canShare ?? false
  },
  share: async (file: File) => {
    options.calls.push('share')
    options.onShare?.(file)
    if (options.shareError !== undefined) throw options.shareError
  },
  download: () => {
    options.calls.push('download')
    if (options.downloadError === true) throw new Error('download blocked')
  },
})

test('fileDownloadRoute: document-relative and path-encoded', () => {
  assert.equal(
    fileDownloadRoute('/ws dir/报告 v2.pdf'),
    'api/mobile-nav.file.download?path=%2Fws%20dir%2F%E6%8A%A5%E5%91%8A%20v2.pdf',
  )
})

test('fileNameFromPath: basename with the download fallback', () => {
  assert.equal(fileNameFromPath('/workspace/report.docx'), 'report.docx')
  assert.equal(fileNameFromPath('/workspace/nested/'), 'download')
  assert.equal(fileNameFromPath(''), 'download')
  assert.equal(fileNameFromPath('C:\\ws\\x.bin'), 'x.bin')
})

test('deliverFile: small file on iOS goes through the share sheet', async () => {
  const calls: string[] = []
  let sharedName = ''
  let sharedType = ''
  const outcome = await deliverFile('/workspace/report.docx', fakeEnvironment({
    calls,
    size: SMALL,
    canShare: true,
    onShare: (file) => { sharedName = file.name; sharedType = file.type },
  }))
  assert.deepEqual(calls, ['head', 'canShare', 'get', 'share'])
  assert.deepEqual(outcome, { kind: 'shared' })
  assert.equal(sharedName, 'report.docx')
  assert.equal(sharedType, 'text/plain')
})

test('deliverFile: without share support the browser downloads the stream', async () => {
  const calls: string[] = []
  const outcome = await deliverFile('/workspace/report.docx', fakeEnvironment({ calls, size: SMALL }))
  assert.deepEqual(calls, ['head', 'canShare', 'download'])
  assert.deepEqual(outcome, { kind: 'saved' })
})

test('deliverFile: a file above the share ceiling streams instead of entering memory', async () => {
  const calls: string[] = []
  const outcome = await deliverFile('/workspace/big.zip', fakeEnvironment({ calls, size: LARGE, canShare: true }))
  assert.deepEqual(calls, ['head', 'canShare', 'download'])
  assert.deepEqual(outcome, { kind: 'saved' })
})

test('deliverFile: an unknown size takes the share path on iOS', async () => {
  const calls: string[] = []
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, size: null, canShare: true }))
  assert.deepEqual(calls, ['head', 'canShare', 'get', 'share'])
  assert.deepEqual(outcome, { kind: 'shared' })
})

test('deliverFile: a cancelled share sheet is a user decision, not a failure', async () => {
  const calls: string[] = []
  const cancelled = Object.assign(new Error('cancelled'), { name: 'AbortError' })
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, canShare: true, shareError: cancelled }))
  assert.deepEqual(calls, ['head', 'canShare', 'get', 'share'])
  assert.deepEqual(outcome, { kind: 'cancelled' })
})

test('deliverFile: a refused share falls through to the streamed download', async () => {
  const calls: string[] = []
  const refused = Object.assign(new Error('not allowed'), { name: 'NotAllowedError' })
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, canShare: true, shareError: refused }))
  assert.deepEqual(calls, ['head', 'canShare', 'get', 'share', 'download'])
  assert.deepEqual(outcome, { kind: 'saved' })
})

test('deliverFile: oversized and missing files map to their labels before any byte moves', async () => {
  const bigCalls: string[] = []
  const big = await deliverFile('/workspace/big.zip', fakeEnvironment({ calls: bigCalls, headStatus: 413, canShare: true }))
  assert.deepEqual(bigCalls, ['head'])
  assert.deepEqual(big, { kind: 'failed', failure: 'too-large' })

  const missingCalls: string[] = []
  const missing = await deliverFile('/workspace/gone.pdf', fakeEnvironment({ calls: missingCalls, headStatus: 404 }))
  assert.deepEqual(missingCalls, ['head'])
  assert.deepEqual(missing, { kind: 'failed', failure: 'missing' })
})

test('deliverFile: a rejected probe or body read reports the generic failure', async () => {
  const probeCalls: string[] = []
  const probe = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls: probeCalls, headError: true }))
  assert.deepEqual(probeCalls, ['head'])
  assert.deepEqual(probe, { kind: 'failed', failure: 'failed' })

  const readCalls: string[] = []
  const read = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls: readCalls, canShare: true, getError: true }))
  assert.deepEqual(readCalls, ['head', 'canShare', 'get'])
  assert.deepEqual(read, { kind: 'failed', failure: 'failed' })
})

test('deliverFile: a blocked download navigation reports the generic failure', async () => {
  const calls: string[] = []
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, downloadError: true }))
  assert.deepEqual(calls, ['head', 'canShare', 'download'])
  assert.deepEqual(outcome, { kind: 'failed', failure: 'failed' })
})

// ---- 下载成功反馈 + 交付卡片下载（2026-09-29 第二版：店主实机「下载成功了也没
// 有提示」/ 卡片右侧宿主控件「点了也没有用」）----
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

test('downloadToastFor: settled successes toast, cancelled/failed stay silent', () => {
  assert.deepEqual(downloadToastFor({ kind: 'shared' }, '/ws/报告 v2.docx'), { key: 'downloadShared', name: '报告 v2.docx' })
  assert.deepEqual(downloadToastFor({ kind: 'saved' }, '/ws/report.pdf'), { key: 'downloadStarted', name: 'report.pdf' })
  // 取消 = 用户决定，失败已由控件自身文案承载——都不许再弹 toast。
  assert.equal(downloadToastFor({ kind: 'cancelled' }, '/ws/a.bin'), null)
  assert.equal(downloadToastFor({ kind: 'failed', failure: 'missing' }, '/ws/a.bin'), null)
})

test('both download surfaces raise the settled-success toast', () => {
  const header = readSource('src/client/components/FileDownloadButton.tsx')
  assert.ok(header.includes('downloadToastFor(outcome, absolutePath)'))
  assert.ok(header.includes('showToast('))
  const card = readSource('src/client/components/DeliverableDownloadButton.tsx')
  assert.ok(card.includes('downloadToastFor(outcome, path)'))
  assert.ok(card.includes('showToast('))
})

test('the card control reads the absolute path off the card and never guesses', () => {
  const source = readSource('src/client/components/DeliverableDownloadButton.tsx')
  // 预览覆盖层（宿主 cardPreview）是卡上唯一携带绝对路径的节点。
  assert.ok(source.includes('button[class*="cardPreview"]'))
  assert.ok(source.includes("closest('[data-presented-file]')"))
  // 路径形状守卫：不像绝对路径（/ 或盘符）就报失败，不猜。
  assert.ok(source.includes("title.startsWith('/')"))
  assert.ok(source.includes('^[A-Za-z]:'))
})

test('the card control is registered into the reserved slot and the host control is shadowed', () => {
  assert.ok(readSource('src/client/index.tsx').includes("ctx.slots.inject('deliverables.file.actions'"))
  // 宿主的 open-in-app 整族控件（file = 预览页头/交付卡片、directory = 会话头部）
  // 在客户形态被 CSS 遮蔽。
  const mode = readSource('src/client/effects/deployment-mode.ts')
  assert.ok(mode.includes('[data-open-target] { display: none !important; }'))
})
