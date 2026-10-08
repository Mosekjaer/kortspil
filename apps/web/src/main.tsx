import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installBackHandler, useApp } from './app'
import { hasRoomToken, useRoom } from './room/roomStore'
import { App } from './App'
import './index.css'

installBackHandler()

// Join links: /r/ABCD opens the join screen; a saved token rejoins directly.
const link = location.pathname.match(/^\/r\/([A-Za-z0-9]{4})\/?$/)
if (link) {
  const code = link[1]!.toUpperCase()
  useApp.getState().go({ name: 'join', code })
  if (hasRoomToken(code)) void useRoom.getState().rejoin(code)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
