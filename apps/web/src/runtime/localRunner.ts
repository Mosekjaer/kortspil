import {
  createCryptoRng,
  type ErrorCode,
  type GameDefinition,
  type Player,
  type PlayerId,
  type Rng,
} from '@kortspil/core'
import type { Runner } from './runner'

/** Runs a game entirely in the browser. Everyone shares the public table view. */
export function createLocalRunner<State, Action, View, Options>(
  game: GameDefinition<State, Action, View, Options>,
  players: Player[],
  options: Options,
  rng: Rng = createCryptoRng(),
): Runner<View, Action> {
  let state = game.setup(players, options, rng)
  let view = game.view(state, 'table')
  const listeners = new Set<() => void>()

  return {
    getView: () => view,
    getStatus: () => 'ready',
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async dispatch(action: Action, actingAs?: PlayerId): Promise<ErrorCode | null> {
      if (!actingAs) return 'NOT_YOUR_TURN'
      const error = game.validate(state, action, actingAs)
      if (error) return error
      state = game.apply(state, action, actingAs, rng)
      view = game.view(state, 'table')
      for (const l of listeners) l()
      return null
    },
    dispose() {
      listeners.clear()
    },
  }
}
