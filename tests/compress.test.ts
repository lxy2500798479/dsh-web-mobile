import { test } from 'node:test'
import assert from 'node:assert/strict'
import { headerValue, isDeferrable, isShellDeferrable, varyWithAcceptEncoding } from '../src/compress.ts'
import { BOOT_BRAND_RULES, HOST_SHELL_TITLE } from '../src/compress.ts'

test('headerValue finds keys regardless of casing', () => {
  assert.equal(headerValue({ 'Content-Type': 'application/json' }, 'content-type'), 'application/json')
  assert.equal(headerValue({ 'content-type': 'text/html' }, 'content-type'), 'text/html')
  assert.equal(headerValue({ 'CONTENT-ENCODING': 'gzip' }, 'content-encoding'), 'gzip')
  assert.equal(headerValue({ 'x-foo': '1' }, 'content-type'), undefined)
  assert.equal(headerValue({}, 'vary'), undefined)
  // Mixed-case keys are the raw writeHead argument reality.
  assert.equal(headerValue({ 'Content-Length': 123 }, 'content-length'), '123')
})

test('isDeferrable honors case-insensitive content-encoding / content-type', () => {
  // Lowercase keys (the pre-fix working case).
  assert.equal(isDeferrable({ 'content-type': 'application/json' }), true)
  assert.equal(isDeferrable({ 'content-type': 'application/json', 'content-encoding': 'gzip' }), false)
  assert.equal(isDeferrable({ 'content-type': 'text/html' }), false)
  // Mixed-case keys silently missed by the pre-fix direct lookup.
  assert.equal(isDeferrable({ 'Content-Type': 'application/json' }), true)
  assert.equal(isDeferrable({ 'Content-Type': 'application/json', 'Content-Encoding': 'br' }), false)
})

test('varyWithAcceptEncoding appends without clobbering, preserving key casing', () => {
  const none = {}
  varyWithAcceptEncoding(none)
  assert.deepEqual(none, { vary: 'Accept-Encoding' })

  const lowercase = { vary: 'Origin' }
  varyWithAcceptEncoding(lowercase)
  assert.equal(lowercase.vary, 'Origin, Accept-Encoding')

  const mixed = { Vary: 'Origin' }
  varyWithAcceptEncoding(mixed)
  assert.equal(mixed.Vary, 'Origin, Accept-Encoding')
  assert.equal(mixed.vary, undefined)
})

test('patched end() replays neither the encoding argument nor callback source (issue #78)', async () => {
  // Raw-socket assertions: fetch/undici tolerate a few trailing bytes, so
  // read the declared length against the actual framed body directly.
  const { installResponseCompression } = await import('../src/compress.ts')
  const http = await import('node:http')
  const { gunzipSync } = await import('node:zlib')
  const restore = installResponseCompression()
  const payload = JSON.stringify({ data: 'x'.repeat(8 * 1024) })
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    if (req.url === '/two-arg') {
      res.end(payload, 'utf8')
    } else {
      res.write(payload)
      res.end(function done() {})
    }
  })
  try {
    await new Promise<void>((resolveListen) => server.listen(0, resolveListen))
    const port = (server.address() as { port: number }).port
    const read = (path: string) => new Promise<{ status: number; headers: Record<string, string | string[]>, body: Buffer }>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path, headers: { 'accept-encoding': 'gzip' } }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
      }).on('error', reject)
    })
    // end(data, 'utf8'): nothing but the compressed payload may be written.
    const twoArg = await read('/two-arg')
    assert.equal(twoArg.headers['content-encoding'], 'gzip')
    assert.equal(twoArg.body.byteLength, Number(twoArg.headers['content-length']), 'body bytes must equal the declared content-length')
    assert.equal(gunzipSync(twoArg.body).toString(), payload, 'the payload round-trips without the encoding string appended')
    // end(callback): the callback must not leak as body data.
    const withCb = await read('/with-callback')
    assert.equal(withCb.headers['content-encoding'], 'gzip')
    assert.equal(withCb.body.byteLength, Number(withCb.headers['content-length']))
    assert.equal(gunzipSync(withCb.body).toString(), payload, 'callback source text must never reach the body')
  } finally {
    server.close()
    restore()
  }
})

test('patched write() replays buffered callbacks fire-once, in order, after end (issue #80)', async () => {
  const { installResponseCompression } = await import('../src/compress.ts')
  const http = await import('node:http')
  const restore = installResponseCompression()
  const fired: string[] = []
  const payload = JSON.stringify({ data: 'y'.repeat(8 * 1024) })
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.write(payload, function firstWrite() { fired.push('first') })
    res.write(payload, function secondWrite() { fired.push('second') })
    res.end(function endCallback() { fired.push('end') })
  })
  try {
    await new Promise<void>((resolveListen) => server.listen(0, resolveListen))
    const port = (server.address() as { port: number }).port
    await new Promise<void>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, headers: { 'accept-encoding': 'br' } }, (res) => {
        res.resume()
        res.on('end', () => resolve())
      }).on('error', reject)
    })
    // Write callbacks replay right after the real end(); the end callback
    // fires on Node's finish event — one bounded beat covers both.
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.deepEqual(fired, ['first', 'second', 'end'])
  } finally {
    server.close()
    restore()
  }
})

test('buffered strings honor the write()/end() encoding, e.g. latin1 (issue #80)', async () => {
  const { installResponseCompression } = await import('../src/compress.ts')
  const http = await import('node:http')
  const { gunzipSync } = await import('node:zlib')
  const restore = installResponseCompression()
  // 'é' is 0xE9 in latin1 but 0xC3 0xA9 in utf8 — a >4KB run makes the
  // silent re-encoding visible in the decompressed byte stream.
  const latin1Chunk = 'é'.repeat(4 * 1024)
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.write(latin1Chunk, 'latin1')
    res.end('é', 'latin1')
  })
  try {
    await new Promise<void>((resolveListen) => server.listen(0, resolveListen))
    const port = (server.address() as { port: number }).port
    const out = await new Promise<{ headers: Record<string, string | string[]>, body: Buffer }>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, headers: { 'accept-encoding': 'gzip' } }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }))
      }).on('error', reject)
    })
    assert.equal(out.headers['content-encoding'], 'gzip')
    const expected = Buffer.concat([Buffer.from(latin1Chunk, 'latin1'), Buffer.from('é', 'latin1')])
    assert.equal(gunzipSync(out.body).equals(expected), true, 'decompressed bytes must be latin1, not silently re-encoded utf8')
  } finally {
    server.close()
    restore()
  }
})

test('isShellDeferrable 只认 text/html，已编码响应不碰', () => {
  assert.equal(isShellDeferrable({ 'content-type': 'text/html' }), true)
  assert.equal(isShellDeferrable({ 'Content-Type': 'text/html; charset=utf-8' }), true)
  assert.equal(isShellDeferrable({ 'content-type': 'application/json' }), false)
  assert.equal(isShellDeferrable({ 'content-type': 'text/html', 'content-encoding': 'gzip' }), false)
  assert.equal(isShellDeferrable({}), false)
})

test('patchShellHtml：title 换品牌 + 注入首帧品牌 CSS；非 shell 逐字节不变', async () => {
  const { patchShellHtml, BOOT_BRAND_STYLE, SHELL_HTML_MARKER } = await import('../src/compress.ts')
  const shell = '<!doctype html><html><head><title>DeepSeek Harness</title></head><body><div id="root"></div></body></html>'
  const out = patchShellHtml(shell)
  assert.equal(out.includes(SHELL_HTML_MARKER), false, 'vendor 标题必须被换掉')
  assert.ok(out.includes('<title>拾贝智能体</title>'))
  assert.ok(out.includes(BOOT_BRAND_STYLE), '首帧品牌样式必须注入')
  assert.ok(out.indexOf(BOOT_BRAND_STYLE) < out.indexOf('</head>'), '注入必须在 </head> 之前（首帧即生效）')
  // 每条规则都在注入的样式里（与客户端兜底同文）
  for (const rule of BOOT_BRAND_RULES) assert.ok(BOOT_BRAND_STYLE.includes(rule), `缺规则: ${rule}`)
  // 非 shell HTML：原样返回（字节级）
  const other = '<!doctype html><html><body>error page</body></html>'
  assert.equal(patchShellHtml(other), other)
})

test('HTML 出口改写走通真实响应管线：body 被改写且 Content-Length 对齐', async () => {
  const { installResponseCompression } = await import('../src/compress.ts')
  const http = await import('node:http')
  const restore = installResponseCompression()
  const shell = '<!doctype html><html><head><title>DeepSeek Harness</title></head><body><div id="root"></div></body></html>'
  const plain = '<!doctype html><html><head><title>Other</title></head><body>x</body></html>'
  const server = http.createServer((req, res) => {
    const body = req.url === '/shell' ? shell : plain
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body) })
    res.end(body)
  })
  try {
    await new Promise<void>((resolveListen) => server.listen(0, resolveListen))
    const port = (server.address() as { port: number }).port
    const get = (path: string) => new Promise<{ headers: Record<string, string | string[]>, body: string }>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
      }).on('error', reject)
    })
    const patched = await get('/shell')
    assert.ok(patched.body.includes('拾贝智能体'))
    assert.equal(patched.body.includes('DeepSeek Harness'), false)
    assert.equal(Number(patched.headers['content-length']), Buffer.byteLength(patched.body), 'Content-Length 必须与改写后的 body 对齐')
    assert.equal(patched.headers['content-encoding'], undefined, 'shell HTML 不压缩')
    const untouched = await get('/plain')
    assert.equal(untouched.body, plain, '非 shell HTML 逐字节不变')
  } finally {
    restore()
    await new Promise<void>((resolveClose) => server.close(() => { resolveClose() }))
  }
})
