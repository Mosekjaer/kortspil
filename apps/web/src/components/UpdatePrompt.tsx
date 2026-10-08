import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from '../app'
import { da } from '../i18n/da'
import { useRoom } from '../room/roomStore'

/** "Ny version – genindlæs", shown only outside a running game. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const inGame = useApp((s) => s.screen.name === 'game')
  const inRoom = useRoom((s) => s.room !== null)
  if (!needRefresh || inGame || inRoom) return null

  return (
    <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[var(--z-toast)]">
      <div className="column px-4">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="sheet-in press flex w-full items-center justify-between gap-3 rounded-full bg-paper py-3 pr-3 pl-5 text-ink shadow-xl"
        >
          <span className="font-semibold">{da.update.available}</span>
          <span className="label rounded-full bg-ink px-4 py-2 text-paper">{da.update.reload}</span>
        </button>
      </div>
    </div>
  )
}
