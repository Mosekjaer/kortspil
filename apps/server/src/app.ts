import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@kortspil/core'
import { createRoomStore } from './rooms.js'
import { attachSocketHandlers } from './socket.js'

export interface ServerOptions {
  publicUrl?: string | undefined
  logLevel?: string | undefined
  /** Built web app to serve; skipped when missing (tests, dev with Vite). */
  webRoot?: string | undefined
  sweepIntervalMs?: number | undefined
}

/**
 * Hashed build output never changes, so it may be cached forever. The entry
 * points must always be revalidated; other public files get a day.
 */
export function cacheControl(path: string): string {
  if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(path)) return 'no-cache'
  if (/[/\\]assets[/\\]/.test(path) || /workbox-[0-9a-f]{8}\.js$/.test(path)) {
    return 'public, max-age=31536000, immutable'
  }
  return 'public, max-age=86400'
}

export async function buildServer(opts: ServerOptions = {}) {
  const app = Fastify({
    trustProxy: true,
    disableRequestLogging: true,
    logger: { level: opts.logLevel ?? 'info' },
  })

  app.get('/healthz', async (_req, reply) => reply.type('text/plain').send('ok'))

  const webRoot = opts.webRoot
  if (webRoot && existsSync(resolve(webRoot, 'index.html'))) {
    await app.register(fastifyStatic, {
      root: resolve(webRoot),
      wildcard: false,
      setHeaders(res, path) {
        res.header('Cache-Control', cacheControl(path))
      },
    })
    // SPA fallback: unknown paths such as /r/ABCD get index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/socket.io')) {
        return reply.code(404).send({ error: 'not found' })
      }
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html')
    })
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    // Below Cloudflare's ~100 s idle timeout; never raise above 60 s.
    pingInterval: 25_000,
    pingTimeout: 20_000,
    ...(opts.publicUrl ? { cors: { origin: opts.publicUrl } } : {}),
  })

  const store = createRoomStore({ publicUrl: opts.publicUrl })
  const sockets = attachSocketHandlers(io, store, app.log)
  const sweep = setInterval(() => sockets.sweep(), opts.sweepIntervalMs ?? 15_000)
  sweep.unref()

  app.addHook('onClose', async () => {
    clearInterval(sweep)
    await io.close()
  })

  return { app, io, store }
}
