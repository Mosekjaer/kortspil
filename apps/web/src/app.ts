import { create } from 'zustand'
import type { GameId, Player, PlayerId } from '@kortspil/core'
import { GAMES } from '@kortspil/core'
import { createLocalRunner } from './runtime/localRunner'
import type { Runner } from './runtime/runner'

export type Screen =
  | { name: 'home' }
  | { name: 'picker' }
  | { name: 'create' }
  | { name: 'join'; code?: string }
  | { name: 'lobby'; gameId: GameId }
  | { name: 'game' }
  | { name: 'settings' }
  | { name: 'rules' }

export interface Session {
  gameId: GameId
  mode: 'single' | 'multi'
  players: Player[]
  options: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runner: Runner<any, any>
  /** Bumped on "play again" so game components remount. */
  round: number
  /** This device's player; null on a shared single phone. */
  me: PlayerId | null
  isHost: boolean
  /** Whether this device may act for a player (own seat, guests, offline seats for the host). */
  canActFor(playerId: PlayerId): boolean
  /** Null when only the host may restart. */
  playAgain: (() => void) | null
  quit(): void
}

interface AppStore {
  screen: Screen
  stack: Screen[]
  session: Session | null
  go(screen: Screen): void
  back(): void
  home(): void
  startSession(session: Pick<Session, 'gameId' | 'players' | 'options' | 'runner'>): void
  replaceRunner(runner: Session['runner']): void
  endSession(): void
}

export const useApp = create<AppStore>((set, get) => ({
  screen: { name: 'home' },
  stack: [],
  session: null,
  go(screen) {
    set((s) => ({ screen, stack: [...s.stack, s.screen] }))
    history.pushState(null, '')
  },
  back() {
    const { stack } = get()
    set({ screen: stack.at(-1) ?? { name: 'home' }, stack: stack.slice(0, -1) })
  },
  home() {
    set({ screen: { name: 'home' }, stack: [] })
  },
  startSession(input) {
    get().session?.runner.dispose()
    const session: Session = {
      ...input,
      mode: 'single',
      round: 0,
      me: null,
      isHost: true,
      canActFor: () => true,
      playAgain: () => {
        const def = GAMES[input.gameId]
        if (def) get().replaceRunner(createLocalRunner(def, input.players, input.options))
      },
      quit: () => get().endSession(),
    }
    set({ session, screen: { name: 'game' }, stack: [{ name: 'home' }] })
    history.pushState(null, '')
  },
  replaceRunner(runner) {
    const { session } = get()
    if (!session) return
    session.runner.dispose()
    set({ session: { ...session, runner, round: session.round + 1 } })
  },
  endSession() {
    get().session?.runner.dispose()
    set({ session: null, screen: { name: 'home' }, stack: [] })
  },
}))

/** Hardware/browser back: step back in the app, but never out of a running game. */
export function installBackHandler(): void {
  history.replaceState(null, '')
  window.addEventListener('popstate', () => {
    const { screen, back } = useApp.getState()
    if (screen.name === 'game') {
      history.pushState(null, '')
      return
    }
    back()
  })
}
