import type { Rng } from '../cards/rng.js'

export type PlayerId = string
export type GameId = 'ringOfFire' | 'bussen'
export type GameMode = 'single' | 'multi'

export interface Player {
  id: PlayerId
  name: string
  /** Plays on the host's device (hybrid mode). */
  isGuest?: boolean
}

/** Machine-readable rejection reasons; the UI maps them to Danish text. */
export type ErrorCode =
  | 'GAME_FINISHED'
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'INVALID_ACTION'
  | 'INVALID_TARGET'
  | 'INVALID_TEXT'

export interface GameDefinition<State, Action, View, Options> {
  id: GameId
  name: string
  minPlayers: number
  maxPlayers: number
  modes: Array<GameMode>
  setup(players: Player[], options: Options, rng: Rng): State
  validate(state: State, action: Action, actorId: PlayerId): ErrorCode | null
  apply(state: State, action: Action, actorId: PlayerId, rng: Rng): State
  view(state: State, viewer: PlayerId | 'table'): View
  isFinished(state: State): boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDefinition = GameDefinition<any, any, any, any>

export class SetupError extends Error {}
