import type { ErrorCode, GameId, PlayerId } from '../engine/types.js'

/** Protocol-level rejections on top of the games' own error codes. */
export type ProtocolErrorCode =
  | ErrorCode
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'TOO_MANY_ROOMS'
  | 'NAME_TAKEN'
  | 'INVALID_TOKEN'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'GAME_IN_PROGRESS'
  | 'GAME_NOT_SUPPORTED'
  | 'PLAYER_COUNT'

export type Ack<T> = ({ ok: true } & T) | { ok: false; error: ProtocolErrorCode }

export type RoomPhase = 'lobby' | 'playing' | 'finished'

export interface RoomPlayerInfo {
  id: PlayerId
  name: string
  isGuest: boolean
  online: boolean
}

/** Lobby info sent to everyone in the room on every change. */
export interface RoomState {
  roomCode: string
  joinUrl: string
  hostId: PlayerId
  gameId: GameId
  options: unknown
  phase: RoomPhase
  players: RoomPlayerInfo[]
}

export interface GameViewMessage<View = unknown> {
  version: number
  view: View
}

export type RoomClosedReason = 'inactive' | 'kicked'

export interface ClientToServerEvents {
  'room:create': (
    payload: { gameId: GameId; hostName: string; options: unknown },
    ack: (res: Ack<{ roomCode: string; playerId: PlayerId; token: string }>) => void,
  ) => void
  'room:join': (
    payload: { roomCode: string; name: string },
    ack: (res: Ack<{ playerId: PlayerId; token: string }>) => void,
  ) => void
  'room:rejoin': (
    payload: { roomCode: string; token: string },
    ack: (res: Ack<{ playerId: PlayerId }>) => void,
  ) => void
  'room:addGuest': (
    payload: { name: string },
    ack: (res: Ack<{ playerId: PlayerId }>) => void,
  ) => void
  'room:kick': (payload: { playerId: PlayerId }, ack: (res: Ack<object>) => void) => void
  'room:reorder': (payload: { playerIds: PlayerId[] }, ack: (res: Ack<object>) => void) => void
  'room:configure': (
    payload: { gameId: GameId; options: unknown },
    ack: (res: Ack<object>) => void,
  ) => void
  'game:start': (payload: Record<string, never>, ack: (res: Ack<object>) => void) => void
  'game:action': (
    payload: { action: unknown; actingAs?: PlayerId },
    ack: (res: Ack<object>) => void,
  ) => void
  'room:leave': (payload: Record<string, never>, ack: (res: Ack<object>) => void) => void
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void
  'game:view': (message: GameViewMessage) => void
  'room:closed': (reason: RoomClosedReason) => void
}
