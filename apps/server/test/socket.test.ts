import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { io as connect, type Socket } from 'socket.io-client'
import {
  DEFAULT_OPTIONS,
  type ClientToServerEvents,
  type GameViewMessage,
  type RingOfFireView,
  type RoomState,
  type ServerToClientEvents,
} from '@kortspil/core'
import { buildServer, cacheControl } from '../src/app.js'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

let server: Awaited<ReturnType<typeof buildServer>>
let url: string
const clients: Client[] = []

beforeEach(async () => {
  server = await buildServer({ logLevel: 'silent' })
  await server.app.listen({ host: '127.0.0.1', port: 0 })
  const addr = server.app.server.address()
  url = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})

afterEach(async () => {
  for (const c of clients.splice(0)) c.close()
  await server.app.close()
})

function client(): Client {
  const c: Client = connect(url, { transports: ['websocket'], reconnection: false })
  clients.push(c)
  return c
}

/** Emits with an ack and resolves with the response. */
function call<E extends keyof ClientToServerEvents>(
  c: Client,
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<Parameters<Parameters<ClientToServerEvents[E]>[1]>[0]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return new Promise((resolve) => (c.emit as Function)(event, payload, resolve))
}

function next<T>(
  c: Client,
  event: 'game:view' | 'room:state',
  where: (m: T) => boolean = () => true,
) {
  return new Promise<T>((resolve) => {
    const handler = (m: T) => {
      if (!where(m)) return
      c.off(event, handler as never)
      resolve(m)
    }
    c.on(event, handler as never)
  })
}

describe('socket protocol', () => {
  it('caches only hashed files forever', () => {
    expect(cacheControl('/app/web/dist/index.html')).toBe('no-cache')
    expect(cacheControl('/app/web/dist/sw.js')).toBe('no-cache')
    expect(cacheControl('/app/web/dist/manifest.webmanifest')).toBe('no-cache')
    expect(cacheControl('/app/web/dist/assets/index-qbjmZF4I.js')).toContain('immutable')
    expect(cacheControl('/app/web/dist/workbox-2fbc6a65.js')).toContain('immutable')
    expect(cacheControl('/app/web/dist/fonts/anton-latin.woff2')).toBe('public, max-age=86400')
  })

  it('healthz answers ok', async () => {
    const res = await server.app.inject({ url: '/healthz' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('ok')
  })

  it('create, join, start, play, disconnect and rejoin', async () => {
    const host = client()
    const sara = client()

    const created = await call(host, 'room:create', {
      gameId: 'ringOfFire',
      hostName: '  Mads  ',
      options: DEFAULT_OPTIONS,
    })
    if (!created.ok) throw new Error(created.error)

    const lobby = next<RoomState>(host, 'room:state', (s) => s.players.length === 2)
    const joined = await call(sara, 'room:join', {
      roomCode: created.roomCode.toLowerCase(),
      name: 'Sara',
    })
    if (!joined.ok) throw new Error(joined.error)
    const state = await lobby
    expect(state.players.map((p) => p.name)).toEqual(['Mads', 'Sara'])
    expect(state.hostId).toBe(created.playerId)
    expect(state.joinUrl).toMatch(new RegExp(`/r/${created.roomCode}$`))

    expect(await call(sara, 'game:start', {})).toEqual({ ok: false, error: 'NOT_HOST' })
    const firstView = next<GameViewMessage<RingOfFireView>>(sara, 'game:view')
    expect(await call(host, 'game:start', {})).toEqual({ ok: true })
    const v1 = await firstView
    expect(v1.view.turnPlayerId).toBe(created.playerId)
    expect(v1.view).not.toHaveProperty('deck')

    expect(await call(sara, 'game:action', { action: { type: 'draw' } })).toEqual({
      ok: false,
      error: 'NOT_YOUR_TURN',
    })
    const afterDraw = next<GameViewMessage<RingOfFireView>>(
      sara,
      'game:view',
      (m) => m.version > v1.version,
    )
    expect(await call(host, 'game:action', { action: { type: 'draw' } })).toEqual({ ok: true })
    const v2 = await afterDraw
    expect(v2.view.deckCount).toBe(51)

    // Sara drops off; the host sees her offline.
    const offline = next<RoomState>(host, 'room:state', (s) => s.players.some((p) => !p.online))
    sara.close()
    await offline

    // She comes back on a new socket with her token and gets a fresh view.
    const back = client()
    const view = next<GameViewMessage<RingOfFireView>>(back, 'game:view')
    const rejoined = await call(back, 'room:rejoin', {
      roomCode: created.roomCode,
      token: joined.token,
    })
    expect(rejoined).toEqual({ ok: true, playerId: joined.playerId })
    const v3 = await view
    expect(v3.version).toBe(v2.version)
    expect(v3.view.lastCard).toEqual(v2.view.lastCard)
  })

  it('validates payloads with Zod', async () => {
    const c = client()
    expect(await call(c, 'room:join', { roomCode: 'O0I1', name: 'X' })).toEqual({
      ok: false,
      error: 'BAD_REQUEST',
    })
    expect(
      await call(c, 'room:create', { gameId: 'poker', hostName: 'X', options: {} } as never),
    ).toEqual({
      ok: false,
      error: 'BAD_REQUEST',
    })
    expect(await call(c, 'game:start', {})).toEqual({ ok: false, error: 'NOT_IN_ROOM' })
  })

  it('rate limits a flooding socket', async () => {
    const c = client()
    const results = await Promise.all(
      Array.from({ length: 40 }, () => call(c, 'room:join', { roomCode: 'ABCD', name: 'X' })),
    )
    expect(results.some((r) => !r.ok && r.error === 'RATE_LIMITED')).toBe(true)
  })

  it('host plays a guest turn via actingAs', async () => {
    const host = client()
    const created = await call(host, 'room:create', {
      gameId: 'ringOfFire',
      hostName: 'Mads',
      options: DEFAULT_OPTIONS,
    })
    if (!created.ok) throw new Error(created.error)
    const guest = await call(host, 'room:addGuest', { name: 'Ole' })
    if (!guest.ok) throw new Error(guest.error)
    await call(host, 'room:reorder', { playerIds: [guest.playerId, created.playerId] })
    await call(host, 'game:start', {})
    const view = next<GameViewMessage<RingOfFireView>>(
      host,
      'game:view',
      (m) => m.view.lastDrawerId !== null,
    )
    expect(
      await call(host, 'game:action', { action: { type: 'draw' }, actingAs: guest.playerId }),
    ).toEqual({
      ok: true,
    })
    expect((await view).view.lastDrawerId).toBe(guest.playerId)
  })
})
