import { useApp } from '../app'
import { GAME_UIS } from '../games/registry'

export function Game() {
  const session = useApp((s) => s.session)
  if (!session) return null
  const GameUi = GAME_UIS[session.gameId].Game
  return GameUi ? <GameUi key={session.round} session={session} /> : null
}
