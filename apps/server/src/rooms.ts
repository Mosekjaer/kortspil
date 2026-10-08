import { customAlphabet, nanoid } from 'nanoid'
import {
  GAMES,
  GAME_SCHEMAS,
  MAX_ROOM_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type AnyGameDefinition,
  type GameId,
  type PlayerId,
  type ProtocolErrorCode,
  type Rng,
  type RoomPhase,
  type RoomState,
} from '@kortspil/core'

export const ROOM_TTL_MS = 30 * 60_000
export const HOST_HANDOVER_MS = 60_000
export const MAX_ROOMS_PER_IP = 10

export class RoomError extends Error {
  constructor(readonly code: ProtocolErrorCode) {
    super(code)
  }
}

export interface RoomPlayer {
  id: PlayerId
  name: string
  /** 128-bit secret for room:rejoin. Guests have none. */
  token: string | null
  isGuest: boolean
  socketId: string | null
}

export interface Room {
  code: string
  gameId: GameId
  options: unknown
  phase: RoomPhase
  players: RoomPlayer[]
  hostId: PlayerId
  game: { state: unknown; version: number } | null
  creatorIp: string
  /** When the last connected player went offline. */
  emptySince: number | null
  /** When the host went offline; the host role moves on after HOST_HANDOVER_MS. */
  hostOfflineSince: number | null
}

const newRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH)
/** nanoid(22) carries 132 bits of entropy. */
const newToken = () => nanoid(22)
const newPlayerId = () => nanoid(10)

function definition(gameId: GameId): AnyGameDefinition {
  const def = GAMES[gameId]
  if (!def || !GAME_SCHEMAS[gameId] || !def.modes.includes('multi')) {
    throw new RoomError('GAME_NOT_SUPPORTED')
  }
  return def
}

function parseOptions(gameId: GameId, options: unknown): unknown {
  definition(gameId)
  const parsed = GAME_SCHEMAS[gameId]!.options.safeParse(options)
  if (!parsed.success) throw new RoomError('BAD_REQUEST')
  return parsed.data
}

const isOnline = (p: RoomPlayer) => p.socketId !== null
/** Guests ride on the host's phone; they never count as connected people. */
const isConnectedPerson = (p: RoomPlayer) => !p.isGuest && isOnline(p)

export function createRoomStore(opts: { now?: () => number; publicUrl?: string | undefined } = {}) {
  const now = opts.now ?? Date.now
  const rooms = new Map<string, Room>()
  const sockets = new Map<string, { code: string; playerId: PlayerId }>()

  function get(code: string): Room {
    const room = rooms.get(code)
    if (!room) throw new RoomError('ROOM_NOT_FOUND')
    return room
  }

  function player(room: Room, id: PlayerId): RoomPlayer {
    const p = room.players.find((x) => x.id === id)
    if (!p) throw new RoomError('NOT_IN_ROOM')
    return p
  }

  function requireHost(room: Room, actorId: PlayerId) {
    if (room.hostId !== actorId) throw new RoomError('NOT_HOST')
  }

  function assertNameFree(room: Room, name: string) {
    const lower = name.toLowerCase()
    if (room.players.some((p) => p.name.toLowerCase() === lower)) {
      throw new RoomError('NAME_TAKEN')
    }
  }

  function assertSeat(room: Room) {
    if (room.players.length >= MAX_ROOM_PLAYERS) throw new RoomError('ROOM_FULL')
  }

  function bind(room: Room, p: RoomPlayer, socketId: string) {
    if (p.socketId) sockets.delete(p.socketId)
    p.socketId = socketId
    sockets.set(socketId, { code: room.code, playerId: p.id })
    room.emptySince = null
    if (p.id === room.hostId) room.hostOfflineSince = null
  }

  function unbind(room: Room, p: RoomPlayer) {
    if (p.socketId) sockets.delete(p.socketId)
    p.socketId = null
    if (p.id === room.hostId) room.hostOfflineSince ??= now()
    if (!room.players.some(isConnectedPerson)) room.emptySince ??= now()
  }

  /** Next connected person after the current host in seating order. */
  function handOverHost(room: Room): boolean {
    const start = room.players.findIndex((p) => p.id === room.hostId)
    for (let i = 1; i <= room.players.length; i++) {
      const candidate = room.players[(start + i) % room.players.length]!
      if (candidate.id !== room.hostId && isConnectedPerson(candidate)) {
        room.hostId = candidate.id
        room.hostOfflineSince = null
        return true
      }
    }
    return false
  }

  function whoIs(socketId: string): { room: Room; player: RoomPlayer } | null {
    const ref = sockets.get(socketId)
    const room = ref && rooms.get(ref.code)
    const p = room?.players.find((x) => x.id === ref!.playerId)
    return room && p ? { room, player: p } : null
  }

  function removePlayer(room: Room, p: RoomPlayer) {
    unbind(room, p)
    room.players = room.players.filter((x) => x.id !== p.id)
  }

  return {
    rooms,

    /** The room and player a socket is bound to, if any. */
    whoIs,

    create(input: {
      gameId: GameId
      hostName: string
      options: unknown
      ip: string
      socketId: string
    }) {
      const options = parseOptions(input.gameId, input.options)
      const owned = [...rooms.values()].filter((r) => r.creatorIp === input.ip).length
      if (owned >= MAX_ROOMS_PER_IP) throw new RoomError('TOO_MANY_ROOMS')

      let code = newRoomCode()
      while (rooms.has(code)) code = newRoomCode()

      const host: RoomPlayer = {
        id: newPlayerId(),
        name: input.hostName,
        token: newToken(),
        isGuest: false,
        socketId: null,
      }
      const room: Room = {
        code,
        gameId: input.gameId,
        options,
        phase: 'lobby',
        players: [host],
        hostId: host.id,
        game: null,
        creatorIp: input.ip,
        emptySince: null,
        hostOfflineSince: null,
      }
      rooms.set(code, room)
      bind(room, host, input.socketId)
      return { room, player: host }
    },

    join(input: { roomCode: string; name: string; socketId: string }) {
      const room = get(input.roomCode)
      if (room.phase !== 'lobby') throw new RoomError('GAME_IN_PROGRESS')
      assertSeat(room)
      assertNameFree(room, input.name)
      const p: RoomPlayer = {
        id: newPlayerId(),
        name: input.name,
        token: newToken(),
        isGuest: false,
        socketId: null,
      }
      room.players.push(p)
      bind(room, p, input.socketId)
      return { room, player: p }
    },

    rejoin(input: { roomCode: string; token: string; socketId: string }) {
      const room = get(input.roomCode)
      const p = room.players.find((x) => x.token !== null && x.token === input.token)
      if (!p) throw new RoomError('INVALID_TOKEN')
      bind(room, p, input.socketId)
      return { room, player: p }
    },

    addGuest(room: Room, actorId: PlayerId, name: string) {
      requireHost(room, actorId)
      if (room.phase === 'playing') throw new RoomError('GAME_IN_PROGRESS')
      assertSeat(room)
      assertNameFree(room, name)
      const guest: RoomPlayer = {
        id: newPlayerId(),
        name,
        token: null,
        isGuest: true,
        socketId: null,
      }
      room.players.push(guest)
      return guest
    },

    /** In the lobby the player is removed; mid-game the seat stays, offline. */
    kick(room: Room, actorId: PlayerId, targetId: PlayerId): RoomPlayer {
      requireHost(room, actorId)
      if (targetId === actorId) throw new RoomError('BAD_REQUEST')
      const target = player(room, targetId)
      if (room.phase === 'playing') {
        unbind(room, target)
        target.token = null
      } else {
        removePlayer(room, target)
      }
      return target
    },

    reorder(room: Room, actorId: PlayerId, playerIds: PlayerId[]) {
      requireHost(room, actorId)
      if (room.phase === 'playing') throw new RoomError('GAME_IN_PROGRESS')
      const ids = new Set(playerIds)
      if (ids.size !== room.players.length || room.players.some((p) => !ids.has(p.id))) {
        throw new RoomError('BAD_REQUEST')
      }
      room.players = playerIds.map((id) => player(room, id))
    },

    configure(room: Room, actorId: PlayerId, gameId: GameId, options: unknown) {
      requireHost(room, actorId)
      if (room.phase === 'playing') throw new RoomError('GAME_IN_PROGRESS')
      room.options = parseOptions(gameId, options)
      room.gameId = gameId
    },

    /** Starts from the lobby, or again after a finished game with the same seats. */
    start(room: Room, actorId: PlayerId, rng: Rng) {
      requireHost(room, actorId)
      if (room.phase === 'playing') throw new RoomError('GAME_IN_PROGRESS')
      const def = definition(room.gameId)
      if (room.players.length < def.minPlayers || room.players.length > def.maxPlayers) {
        throw new RoomError('PLAYER_COUNT')
      }
      const seats = room.players.map((p) => ({ id: p.id, name: p.name, isGuest: p.isGuest }))
      const state = def.setup(seats, room.options, rng)
      room.game = { state, version: (room.game?.version ?? 0) + 1 }
      room.phase = 'playing'
    },

    /**
     * Applies a game action. `actingAs` lets the host play for guests and
     * offline players; nobody else may act for anyone.
     */
    action(
      room: Room,
      actorId: PlayerId,
      rawAction: unknown,
      actingAs: PlayerId | undefined,
      rng: Rng,
    ) {
      if (room.phase !== 'playing' || !room.game) throw new RoomError('WRONG_PHASE')
      const actor = player(room, actorId)
      let effective = actor
      if (actingAs && actingAs !== actorId) {
        requireHost(room, actorId)
        const target = player(room, actingAs)
        if (!target.isGuest && isOnline(target)) throw new RoomError('NOT_YOUR_TURN')
        effective = target
      }
      const schemas = GAME_SCHEMAS[room.gameId]!
      const parsed = schemas.action.safeParse(rawAction)
      if (!parsed.success) throw new RoomError('INVALID_ACTION')
      // Table actions (turning shared cards) belong to the host in a room.
      const type = (parsed.data as { type: string }).type
      if (schemas.hostOnly?.includes(type)) requireHost(room, actorId)

      const def = definition(room.gameId)
      const error = def.validate(room.game.state, parsed.data, effective.id)
      if (error) throw new RoomError(error)
      const state = def.apply(room.game.state, parsed.data, effective.id, rng)
      room.game = { state, version: room.game.version + 1 }
      if (def.isFinished(state)) room.phase = 'finished'
    },

    /** Leaving the lobby frees the seat; mid-game the seat stays for the host to play. */
    leave(room: Room, actorId: PlayerId) {
      const p = player(room, actorId)
      const wasHost = room.hostId === actorId
      if (room.phase === 'playing') {
        unbind(room, p)
        p.token = null
      } else {
        removePlayer(room, p)
      }
      if (wasHost) handOverHost(room)
      if (room.players.filter((x) => !x.isGuest).length === 0) rooms.delete(room.code)
    },

    disconnect(socketId: string): Room | null {
      const ref = whoIs(socketId)
      if (!ref) return null
      unbind(ref.room, ref.player)
      return ref.room
    },

    /** Hands over lost hosts and deletes rooms nobody has been in for 30 minutes. */
    sweep(): { changed: Room[]; closed: string[] } {
      const t = now()
      const changed: Room[] = []
      const closed: string[] = []
      for (const room of rooms.values()) {
        if (room.emptySince !== null && t - room.emptySince >= ROOM_TTL_MS) {
          rooms.delete(room.code)
          closed.push(room.code)
          continue
        }
        if (
          room.hostOfflineSince !== null &&
          t - room.hostOfflineSince >= HOST_HANDOVER_MS &&
          handOverHost(room)
        ) {
          changed.push(room)
        }
      }
      return { changed, closed }
    },

    publicState(room: Room, origin: string): RoomState {
      const base = (opts.publicUrl || origin).replace(/\/$/, '')
      return {
        roomCode: room.code,
        joinUrl: `${base}/r/${room.code}`,
        hostId: room.hostId,
        gameId: room.gameId,
        options: room.options,
        phase: room.phase,
        players: room.players.map((p) => ({
          id: p.id,
          name: p.name,
          isGuest: p.isGuest,
          online: p.isGuest ? isOnline(player(room, room.hostId)) : isOnline(p),
        })),
      }
    },

    viewFor(room: Room, playerId: PlayerId): { version: number; view: unknown } | null {
      if (!room.game) return null
      const def = definition(room.gameId)
      return { version: room.game.version, view: def.view(room.game.state, playerId) }
    },
  }
}

export type RoomStore = ReturnType<typeof createRoomStore>
