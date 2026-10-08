import { useState, type ReactNode } from 'react'
import { useWakeLock } from '../hooks/useWakeLock'
import { da } from '../i18n/da'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { IconButton } from './Icon'

export interface MenuItem {
  label: string
  onSelect: () => void
}

/** Shared game chrome: whose turn it is, a menu with quit, screen kept awake. */
export function GameFrame({
  title,
  menuItems = [],
  onQuit,
  banner,
  footer,
  children,
}: {
  /** Whose turn it is, already phrased. */
  title: string
  menuItems?: MenuItem[]
  onQuit: () => void
  /** Connection notice above the game, e.g. while reconnecting. */
  banner?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  const [menu, setMenu] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  useWakeLock(true)

  return (
    <>
      <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)]">
        <header className="flex min-h-16 items-center gap-2 pl-4">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p key={title} className="fade-in truncate text-2xl font-bold">
              {title}
            </p>
          </div>
          <IconButton icon="dots" label={da.game.menu} onClick={() => setMenu(true)} />
        </header>
        {banner}
        <main className="flex-1 overflow-y-auto px-4 pb-2">{children}</main>
        {footer && (
          <footer className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>

      <BottomSheet open={menu} title={da.game.menu} onClose={() => setMenu(false)}>
        <div className="flex flex-col gap-3">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant="secondary"
              onClick={() => {
                setMenu(false)
                item.onSelect()
              }}
            >
              {item.label}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setMenu(false)
              setConfirmQuit(true)
            }}
          >
            {da.game.quit}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmQuit}
        title={da.game.quitConfirm}
        onClose={() => setConfirmQuit(false)}
      >
        <div className="flex flex-col gap-3">
          <Button onClick={onQuit}>{da.game.quit}</Button>
          <Button variant="ghost" onClick={() => setConfirmQuit(false)}>
            {da.cancel}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
