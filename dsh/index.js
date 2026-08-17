// dsh-eye-upload: companion of the vision bridge (image_understand).
// Saves browser-picked images into the workspace and hands back the
// absolute path, so a text-only main model can still "see" images via
// the image_understand tool. Everything lives in this plugin: remove the
// bundle row (dsh plugin remove / patch) to turn it off.
//
// Routes (web profile):
//   POST /dsh-eye-upload   { mediaType, name?, data(base64) } -> { ok, path }
//   GET  /dsh-eye-upload/config -> { targetDir, maxBytes }
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-eye-upload'

export function apply(ctx, config = {}) {
  const sendJson = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  const maxBytes = Number(config.maxBytes) || 10 * 1024 * 1024

  /** Preferred save root: configured dir > first workspace > home fallback. */
  function targetRoot() {
    if (typeof config.targetDir === 'string' && config.targetDir.trim()) return config.targetDir.trim()
    try {
      const registry = ctx.get('workspaceRegistry')
      const first = registry?.list?.().find(w => typeof w.path === 'string' && w.path)
      if (first) return join(first.path, '.dsh-vision')
    } catch { /* workspace service absent */ }
    return join(homedir(), '.dsh', 'vision-uploads')
  }

  const MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

  ctx.inject(['webServer'], (scope) => {
    scope.webServer.register({
      kind: 'exact',
      path: '/dsh-eye-upload',
      handler: async (req, res) => {
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
        let raw = ''
        for await (const chunk of req) raw += chunk
        let body
        try { body = JSON.parse(raw || '{}') } catch { sendJson(res, 400, { ok: false, error: 'invalid JSON' }); return }
        const { mediaType, data, name } = body || {}
        if (typeof mediaType !== 'string' || !MEDIA_TYPES.has(mediaType)) {
          sendJson(res, 400, { ok: false, error: 'unsupported media type' }); return
        }
        if (typeof data !== 'string' || data.length === 0) {
          sendJson(res, 400, { ok: false, error: 'missing base64 data' }); return
        }
        if (data.length > Math.ceil(maxBytes * 4 / 3) + 64) {
          sendJson(res, 413, { ok: false, error: 'image too large' }); return
        }
        let bytes
        try {
          bytes = Buffer.from(data, 'base64')
          if (bytes.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')) throw new Error('non-canonical')
        } catch {
          sendJson(res, 400, { ok: false, error: 'invalid base64' }); return
        }
        if (bytes.byteLength > maxBytes) { sendJson(res, 413, { ok: false, error: 'image too large' }); return }
        const root = targetRoot()
        await mkdir(root, { recursive: true })
        const stamp = Date.now()
        const safeName = String(name ?? 'image').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 80) || 'image'
        const file = join(root, `${stamp}-${safeName}.${EXT[mediaType]}`)
        await writeFile(file, bytes)
        sendJson(res, 200, { ok: true, path: file })
      },
    })

    scope.webServer.register({
      kind: 'exact',
      path: '/dsh-eye-upload/config',
      handler: async (_req, res) => {
        sendJson(res, 200, { targetDir: targetRoot(), maxBytes })
      },
    })
  })
}
