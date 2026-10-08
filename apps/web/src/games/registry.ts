import type { ComponentType } from 'react'
import { DEFAULT_OPTIONS, type GameId } from '@kortspil/core'
import type { Session } from '../app'
import { da } from '../i18n/da'
import { useSettings } from '../settings'
import { effectiveRules } from './ringOfFire/customRules'
import { RingOfFireGame } from './ringOfFire/RingOfFireGame'
import { BussenGame } from './bussen/BussenGame'

export interface LobbyToggle {
  key: string
  label: string
  default: boolean
}

export interface GameUi {
  id: GameId
  /** UI exists; games without one are listed as "coming soon". */
  ready: boolean
  lobbyToggles: LobbyToggle[]
  /** Built at start so custom rules and penalty are locked for the game. */
  createOptions(toggles: Record<string, boolean>): unknown
  Game: ComponentType<{ session: Session }> | null
}

export const GAME_UIS: Record<GameId, GameUi> = {
  ringOfFire: {
    id: 'ringOfFire',
    ready: true,
    lobbyToggles: [
      {
        key: 'endOnFourthKing',
        label: da.lobby.endOnFourthKing,
        default: DEFAULT_OPTIONS.endOnFourthKing,
      },
    ],
    createOptions: (toggles) => ({
      rules: effectiveRules(),
      penalty: useSettings.getState().penalty,
      endOnFourthKing: toggles.endOnFourthKing ?? DEFAULT_OPTIONS.endOnFourthKing,
    }),
    Game: RingOfFireGame,
  },
  bussen: {
    id: 'bussen',
    ready: true,
    lobbyToggles: [],
    createOptions: () => ({ penalty: useSettings.getState().penalty }),
    Game: BussenGame,
  },
}
