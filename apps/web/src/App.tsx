import { useEffect, useRef } from 'react'
import { useApp } from './app'
import { Toast } from './components/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { da } from './i18n/da'
import { RoomGame } from './room/RoomGame'
import { RoomLobby } from './room/RoomLobby'
import { useRoom } from './room/roomStore'
import { CreateRoom } from './screens/CreateRoom'
import { JoinRoom } from './screens/JoinRoom'
import { AgeGate } from './screens/AgeGate'
import { Game } from './screens/Game'
import { GamePicker } from './screens/GamePicker'
import { Home } from './screens/Home'
import { Lobby } from './screens/Lobby'
import { RulesEditor } from './screens/RulesEditor'
import { Settings } from './screens/Settings'
import { useSettings } from './settings'

export function App() {
  const screen = useApp((s) => s.screen)
  const ageConfirmed = useSettings((s) => s.ageConfirmed)
  const roomPhase = useRoom((s) => s.room?.phase)
  const closed = useRoom((s) => s.closed)
  const clearClosed = useRoom((s) => s.clearClosed)

  // Leaving or losing a room always lands on the home screen.
  const wasInRoom = useRef(false)
  useEffect(() => {
    if (wasInRoom.current && !roomPhase) useApp.getState().home()
    wasInRoom.current = !!roomPhase
  }, [roomPhase])

  if (roomPhase) {
    return (
      <>
        {roomPhase === 'lobby' ? <RoomLobby /> : <RoomGame />}
        {!ageConfirmed && <AgeGate />}
      </>
    )
  }

  return (
    <>
      {screen.name === 'home' && <Home />}
      {screen.name === 'picker' && <GamePicker />}
      {screen.name === 'lobby' && <Lobby gameId={screen.gameId} />}
      {screen.name === 'game' && <Game />}
      {screen.name === 'settings' && <Settings />}
      {screen.name === 'rules' && <RulesEditor />}
      {screen.name === 'create' && <CreateRoom />}
      {screen.name === 'join' && <JoinRoom code={screen.code} />}
      {!ageConfirmed && <AgeGate />}
      <Toast message={closed ? da.room.closed[closed] : null} onDone={clearClosed} />
      <UpdatePrompt />
    </>
  )
}
