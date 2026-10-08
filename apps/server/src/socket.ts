import type { Server, Socket } from 'socket.io'
import type { z } from 'zod'
import {
  createCryptoRng,
  emptySchema,
  gameActionSchema,
  roomAddGuestSchema,
  roomConfigureSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomKickSchema,
  roomRejoinSchema,
  roomReorderSchema,
  type Ack,
  type ClientToServerEvents,
  type ProtocolErrorCode,
  type ServerToClientEvents,
} from '@kortspil/core'
import { RoomError, type Room, type RoomStore } from './rooms.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/** Simple token bucket per socket: 20 events per second. */
const RATE_PER_SECOND = 20

export function attachSocketHandlers(
  io: IO,
  store: RoomStore,
  log: { warn: (o: object, m: string) => void },
) {
  const rng = createCryptoRng()

  function originOf(socket: ClientSocket): string {
    const h = socket.handshake.headers
    const proto = (h['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'http'
    const host = (h['x-forwarded-host'] as string | undefined) ?? h.host ?? 'localhost'
    return `${proto}://${host}`
  }

  /** Lobby info to everyone, then each connected player's own view. */
  function broadcast(room: Room) {
    const sockets = io.sockets.sockets
    for (const p of room.players) {
      if (!p.socketId) continue
      const s = sockets.get(p.socketId)
      if (!s) continue
      s.emit('room:state', store.publicState(room, originOf(s)))
      const view = store.viewFor(room, p.id)
      if (view) s.emit('game:view', view)
    }
  }

  io.on('connection', (socket) => {
    let tokens = RATE_PER_SECOND
    let refilled = Date.now()
    const allow = () => {
      const t = Date.now()
      tokens = Math.min(RATE_PER_SECOND, tokens + ((t - refilled) / 1000) * RATE_PER_SECOND)
      refilled = t
      if (tokens < 1) return false
      tokens -= 1
      return true
    }

    /**
     * Wraps a handler: rate limit, Zod validation, RoomError -> error ack,
     * and a broadcast of whatever room changed.
     */
    function on<E extends keyof ClientToServerEvents, S extends z.ZodType, R extends object>(
      event: E,
      schema: S,
      handler: (payload: z.output<S>) => { room: Room | null; result: R },
    ) {
      socket.on(event, ((payload: unknown, ack: unknown) => {
        const reply = (typeof ack === 'function' ? ack : () => {}) as (res: Ack<R>) => void
        const fail = (error: ProtocolErrorCode) => reply({ ok: false, error })
        if (!allow()) return fail('RATE_LIMITED')
        const parsed = schema.safeParse(payload)
        if (!parsed.success) return fail('BAD_REQUEST')
        try {
          const { room, result } = handler(parsed.data)
          reply({ ok: true, ...result })
          if (room && store.rooms.has(room.code)) broadcast(room)
        } catch (err) {
          if (err instanceof RoomError) return fail(err.code)
          log.warn({ err, event }, 'socket handler failed')
          fail('BAD_REQUEST')
        }
      }) as never)
    }

    const me = () => {
      const ref = store.whoIs(socket.id)
      if (!ref) throw new RoomError('NOT_IN_ROOM')
      return ref
    }

    /** A socket belongs to at most one room. */
    const enter = (room: Room) => {
      const previous = store.whoIs(socket.id)
      if (previous && previous.room.code !== room.code) void socket.leave(previous.room.code)
      void socket.join(room.code)
    }

    const leaveCurrent = () => {
      const current = store.whoIs(socket.id)
      if (current) {
        store.disconnect(socket.id)
        void socket.leave(current.room.code)
        broadcast(current.room)
      }
    }

    on('room:create', roomCreateSchema, (p) => {
      leaveCurrent()
      const { room, player } = store.create({
        gameId: p.gameId,
        hostName: p.hostName,
        options: p.options,
        ip: socket.handshake.address,
        socketId: socket.id,
      })
      enter(room)
      return { room, result: { roomCode: room.code, playerId: player.id, token: player.token! } }
    })

    on('room:join', roomJoinSchema, (p) => {
      leaveCurrent()
      const { room, player } = store.join({
        roomCode: p.roomCode,
        name: p.name,
        socketId: socket.id,
      })
      enter(room)
      return { room, result: { playerId: player.id, token: player.token! } }
    })

    on('room:rejoin', roomRejoinSchema, (p) => {
      const current = store.whoIs(socket.id)
      if (current && current.room.code !== p.roomCode) leaveCurrent()
      const { room, player } = store.rejoin({
        roomCode: p.roomCode,
        token: p.token,
        socketId: socket.id,
      })
      enter(room)
      return { room, result: { playerId: player.id } }
    })

    on('room:addGuest', roomAddGuestSchema, (p) => {
      const { room, player } = me()
      const guest = store.addGuest(room, player.id, p.name)
      return { room, result: { playerId: guest.id } }
    })

    on('room:kick', roomKickSchema, (p) => {
      const { room, player } = me()
      const target = room.players.find((x) => x.id === p.playerId)
      const targetSocket = target?.socketId ? io.sockets.sockets.get(target.socketId) : undefined
      store.kick(room, player.id, p.playerId)
      if (targetSocket) {
        targetSocket.emit('room:closed', 'kicked')
        void targetSocket.leave(room.code)
      }
      return { room, result: {} }
    })

    on('room:reorder', roomReorderSchema, (p) => {
      const { room, player } = me()
      store.reorder(room, player.id, p.playerIds)
      return { room, result: {} }
    })

    on('room:configure', roomConfigureSchema, (p) => {
      const { room, player } = me()
      store.configure(room, player.id, p.gameId, p.options)
      return { room, result: {} }
    })

    on('game:start', emptySchema, () => {
      const { room, player } = me()
      store.start(room, player.id, rng)
      return { room, result: {} }
    })

    on('game:action', gameActionSchema, (p) => {
      const { room, player } = me()
      store.action(room, player.id, p.action, p.actingAs, rng)
      return { room, result: {} }
    })

    on('room:leave', emptySchema, () => {
      const { room, player } = me()
      store.leave(room, player.id)
      void socket.leave(room.code)
      return { room, result: {} }
    })

    socket.on('disconnect', () => {
      const room = store.disconnect(socket.id)
      if (room) broadcast(room)
    })
  })

  return {
    broadcast,
    /** Periodic housekeeping; call from an interval. */
    sweep() {
      const { changed } = store.sweep()
      for (const room of changed) broadcast(room)
    },
  }
}
