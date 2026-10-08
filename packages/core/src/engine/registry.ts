import { bussen } from '../games/bussen/rules.js'
import { ringOfFire } from '../games/ringOfFire/rules.js'
import type { AnyGameDefinition, GameId } from './types.js'

export const GAMES: Partial<Record<GameId, AnyGameDefinition>> = {
  ringOfFire,
  bussen,
}

export function getGame(id: GameId): AnyGameDefinition | undefined {
  return GAMES[id]
}
