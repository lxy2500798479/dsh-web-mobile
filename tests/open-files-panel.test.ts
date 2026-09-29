// The Files control must act on the surface the user actually has: the host's
// right sidebar when present (0.1.5 ships the workspace tree there), and only
// otherwise the third-party explorer marker. Regression this guards: the
// control toggled the explorer marker unconditionally, so on a host without
// dsh-web-ui-all it painted an icon that did nothing at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openFilesPanel, HOST_FILES_CLOSER, HOST_FILES_OPENER } from '../src/client/components/open-files-panel.ts'
import { deliverFile, fileDownloadRoute, fileNameFromPath, type FileDeliveryEnvironment } from '../src/client/core/file-download.ts'

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
// only way to take a container file onto the device (2026-09-29 report「文件没
// 有下载的渠道」). Its decision order is pinned with injected fakes: share
// first when the environment supports files (the customer entry is an iOS
// standalone PWA, where anchor downloads are silently ignored), the anchor
// save as the fallback, cancellation honored as a user decision, and HTTP
// failures mapped to the three user-facing classes.
const BLOB = new Blob(['payload'], { type: 'text/plain' })

interface FakeOptions {
  readonly calls: string[]
  readonly status?: number
  readonly fetchError?: boolean
  readonly canShare?: boolean
  readonly shareError?: unknown
  readonly onShare?: (file: File) => void
  readonly onSave?: (name: string) => void
}

const fakeEnvironment = (options: FakeOptions): FileDeliveryEnvironment => ({
  fetchBytes: async () => {
    options.calls.push('fetch')
    if (options.fetchError === true) throw new TypeError('network down')
    if (options.status !== undefined && options.status !== 200) return { ok: false, status: options.status }
    return { ok: true, blob: BLOB }
  },
  canShare: () => {
    options.calls.push('canShare')
    return options.canShare ?? false
  },
  share: async (file: File) => {
    options.calls.push('share')
    options.onShare?.(file)
    if (options.shareError !== undefined) throw options.shareError
  },
  save: (_blob: Blob, name: string) => {
    options.calls.push('save')
    options.onSave?.(name)
  },
})

test('fileDownloadRoute: document-relative and path-encoded', () => {
  assert.equal(
    fileDownloadRoute('/ws dir/报告 v2.pdf'),
    'api/file?path=%2Fws%20dir%2F%E6%8A%A5%E5%91%8A%20v2.pdf',
  )
})

test('fileNameFromPath: basename with the download fallback', () => {
  assert.equal(fileNameFromPath('/workspace/report.docx'), 'report.docx')
  assert.equal(fileNameFromPath('/workspace/nested/'), 'download')
  assert.equal(fileNameFromPath(''), 'download')
  assert.equal(fileNameFromPath('C:\\ws\\x.bin'), 'x.bin')
})

test('deliverFile: prefers the share sheet when the environment can share files', async () => {
  const calls: string[] = []
  let sharedName = ''
  let sharedType = ''
  const outcome = await deliverFile('/workspace/report.docx', fakeEnvironment({
    calls,
    canShare: true,
    onShare: (file) => { sharedName = file.name; sharedType = file.type },
  }))
  assert.deepEqual(calls, ['fetch', 'canShare', 'share'])
  assert.deepEqual(outcome, { kind: 'shared' })
  assert.equal(sharedName, 'report.docx')
  assert.equal(sharedType, 'text/plain')
})

test('deliverFile: falls back to the anchor save without share support', async () => {
  const calls: string[] = []
  let savedName = ''
  const outcome = await deliverFile('/workspace/report.docx', fakeEnvironment({
    calls,
    onSave: (name) => { savedName = name },
  }))
  assert.deepEqual(calls, ['fetch', 'canShare', 'save'])
  assert.deepEqual(outcome, { kind: 'saved' })
  assert.equal(savedName, 'report.docx')
})

test('deliverFile: a cancelled share sheet is a user decision, not a failure', async () => {
  const calls: string[] = []
  const cancelled = Object.assign(new Error('cancelled'), { name: 'AbortError' })
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, canShare: true, shareError: cancelled }))
  assert.deepEqual(calls, ['fetch', 'canShare', 'share'])
  assert.deepEqual(outcome, { kind: 'cancelled' })
})

test('deliverFile: a refused share falls back to the anchor save', async () => {
  const calls: string[] = []
  const refused = Object.assign(new Error('not allowed'), { name: 'NotAllowedError' })
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, canShare: true, shareError: refused }))
  assert.deepEqual(calls, ['fetch', 'canShare', 'share', 'save'])
  assert.deepEqual(outcome, { kind: 'saved' })
})

test('deliverFile: oversized and missing files map to their labels without a handoff', async () => {
  const bigCalls: string[] = []
  const big = await deliverFile('/workspace/big.zip', fakeEnvironment({ calls: bigCalls, status: 413, canShare: true }))
  assert.deepEqual(bigCalls, ['fetch'])
  assert.deepEqual(big, { kind: 'failed', failure: 'too-large' })

  const missingCalls: string[] = []
  const missing = await deliverFile('/workspace/gone.pdf', fakeEnvironment({ calls: missingCalls, status: 404 }))
  assert.deepEqual(missingCalls, ['fetch'])
  assert.deepEqual(missing, { kind: 'failed', failure: 'missing' })
})

test('deliverFile: a rejected fetch reports the generic failure', async () => {
  const calls: string[] = []
  const outcome = await deliverFile('/workspace/a.bin', fakeEnvironment({ calls, fetchError: true }))
  assert.deepEqual(calls, ['fetch'])
  assert.deepEqual(outcome, { kind: 'failed', failure: 'failed' })
})
