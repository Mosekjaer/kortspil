import { useMemo } from 'react'
import type { Player, PlayerId } from '@kortspil/core'
import type { Session } from '../app'
import { GAME_UIS } from '../games/registry'
import { createRemoteRunner } from '../runtime/remoteRunner'
import { useRoom } from './roomStore'

/** A running game in a room, wired as a Session so game screens stay mode-agnostic. */
export function RoomGame() {
  const room = useRoom((s) => s.room)!
  const me = useRoom((s) => s.playerId)
  const hasView = useRoom((s) => s.game !== null)
  const runner = useMemo(() => createRemoteRunner(), [])

  const isHost = room.hostId === me
  const offline = new Set(room.players.filter((p) => p.isGuest || !p.online).map((p) => p.id))
  const players: Player[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isGuest: p.isGuest,
  }))

  const session: Session = {
    gameId: room.gameId,
    mode: 'multi',
    players,
    options: room.options,
    runner,
    round: 0,
    me,
    isHost,
    canActFor: (id: PlayerId) => id === me || (isHost && offline.has(id)),
    playAgain: isHost ? () => void useRoom.getState().call('game:start', {}) : null,
    quit: () => void useRoom.getState().leave(),
  }

  const Game = GAME_UIS[room.gameId].Game
  if (!Game || !hasView) return null
  return <Game session={session} />
}
