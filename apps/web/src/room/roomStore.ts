import { io, type Socket } from 'socket.io-client'
import { create } from 'zustand'
import type {
  Ack,
  ClientToServerEvents,
  GameId,
  GameViewMessage,
  PlayerId,
  ProtocolErrorCode,
  RoomClosedReason,
  RoomState,
  ServerToClientEvents,
} from '@kortspil/core'
import { keys, load, remove, save } from '../storage'

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'reconnecting'

interface RoomStore {
  status: ConnectionStatus
  roomCode: string | null
  playerId: PlayerId | null
  room: RoomState | null
  game: GameViewMessage | null
  closed: RoomClosedReason | 'lost' | null
  create(gameId: GameId, hostName: string, options: unknown): Promise<ProtocolErrorCode | null>
  join(roomCode: string, name: string): Promise<ProtocolErrorCode | null>
  /** Re-enters a room with the token saved on this device. */
  rejoin(roomCode: string): Promise<ProtocolErrorCode | null>
  leave(): Promise<void>
  call<E extends keyof ClientToServerEvents>(
    event: E,
    payload: Parameters<ClientToServerEvents[E]>[0],
  ): Promise<ProtocolErrorCode | null>
  clearClosed(): void
}

let socket: ClientSocket | null = null
const ACK_TIMEOUT_MS = 8000

/** Emits with an ack; a dead connection resolves as an error instead of hanging. */
function emit<E extends keyof ClientToServerEvents>(
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<Ack<Record<string, unknown>>> {
  const s = getSocket()
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    ;(s.timeout(ACK_TIMEOUT_MS).emit as Function)(event, payload, (err: unknown, res: unknown) =>
      resolve(err ? { ok: false, error: 'BAD_REQUEST' } : (res as Ack<Record<string, unknown>>)),
    )
  })
}

export function hasRoomToken(roomCode: string): boolean {
  return load<string | null>(keys.roomToken(roomCode), null) !== null
}

export const useRoom = create<RoomStore>((set, get) => {
  const enter = (roomCode: string, playerId: PlayerId, token?: string) => {
    if (token) save(keys.roomToken(roomCode), token)
    set({ roomCode, playerId, status: 'ready', closed: null })
    // A reload on /r/CODE rejoins with the saved token.
    history.replaceState(null, '', `/r/${roomCode}`)
  }

  const forget = (closed: RoomStore['closed']) => {
    const { roomCode } = get()
    if (roomCode) remove(keys.roomToken(roomCode))
    set({ roomCode: null, playerId: null, room: null, game: null, closed, status: 'idle' })
    history.replaceState(null, '', '/')
  }

  return {
    status: 'idle',
    roomCode: null,
    playerId: null,
    room: null,
    game: null,
    closed: null,

    async create(gameId, hostName, options) {
      set({ status: 'connecting' })
      const res = await emit('room:create', { gameId, hostName, options })
      if (!res.ok) {
        set({ status: 'idle' })
        return res.error
      }
      enter(res.roomCode as string, res.playerId as string, res.token as string)
      return null
    },

    async join(roomCode, name) {
      set({ status: 'connecting' })
      const res = await emit('room:join', { roomCode, name })
      if (!res.ok) {
        set({ status: 'idle' })
        return res.error
      }
      enter(roomCode.toUpperCase(), res.playerId as string, res.token as string)
      return null
    },

    async rejoin(roomCode) {
      const token = load<string | null>(keys.roomToken(roomCode), null)
      if (!token) return 'INVALID_TOKEN'
      set({ status: get().roomCode ? 'reconnecting' : 'connecting', roomCode })
      const res = await emit('room:rejoin', { roomCode, token })
      if (!res.ok) {
        if (res.error === 'INVALID_TOKEN' || res.error === 'ROOM_NOT_FOUND') forget('lost')
        else set({ status: 'reconnecting' })
        return res.error
      }
      enter(roomCode, res.playerId as string)
      return null
    },

    async leave() {
      if (get().roomCode) await emit('room:leave', {})
      forget(null)
    },

    async call(event, payload) {
      const res = await emit(event, payload)
      return res.ok ? null : res.error
    },

    clearClosed() {
      set({ closed: null })
    },
  }
})

function getSocket(): ClientSocket {
  if (socket) return socket
  // Same origin; Vite proxies /socket.io in development. Default transports:
  // long-polling first, then upgrade to WebSocket (works behind Cloudflare).
  socket = io({ autoConnect: true })

  socket.on('connect', () => {
    const { roomCode, playerId } = useRoom.getState()
    if (roomCode && playerId) void useRoom.getState().rejoin(roomCode)
  })
  socket.on('disconnect', () => {
    if (useRoom.getState().roomCode) useRoom.setState({ status: 'reconnecting' })
  })
  socket.on('room:state', (room) => {
    if (room.roomCode === useRoom.getState().roomCode) useRoom.setState({ room })
  })
  socket.on('game:view', (message) => {
    const current = useRoom.getState().game
    // Views are full snapshots; an older version can only be a stale message.
    if (current && message.version < current.version) return
    useRoom.setState({ game: message })
  })
  socket.on('room:closed', (reason) => {
    const { roomCode } = useRoom.getState()
    if (roomCode) remove(keys.roomToken(roomCode))
    useRoom.setState({
      roomCode: null,
      playerId: null,
      room: null,
      game: null,
      closed: reason,
      status: 'idle',
    })
    history.replaceState(null, '', '/')
  })

  // Phones suspend sockets in the background; refresh as soon as we are back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    const { roomCode } = useRoom.getState()
    if (!roomCode || !socket) return
    if (socket.connected) void useRoom.getState().rejoin(roomCode)
    else socket.connect()
  })
  return socket
}
