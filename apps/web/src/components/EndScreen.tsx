import type { ReactNode } from 'react'
import { da } from '../i18n/da'
import { Button } from './Button'
import { ScreenLayout } from './ScreenLayout'

export function EndScreen({
  reason,
  stats,
  onPlayAgain,
  onQuit,
}: {
  reason: ReactNode
  /** Big numbers with a label, e.g. cards drawn. */
  stats: Array<{ value: number; label: string }>
  /** Null when someone else (the host) restarts. */
  onPlayAgain: (() => void) | null
  onQuit: () => void
}) {
  return (
    <ScreenLayout
      footer={
        <>
          {onPlayAgain ? (
            <Button className="min-h-18 text-xl" onClick={onPlayAgain}>
              {da.game.playAgain}
            </Button>
          ) : (
            <p className="label text-center text-muted">{da.game.waitForHostRestart}</p>
          )}
          <Button variant="ghost" onClick={onQuit}>
            {da.game.toHome}
          </Button>
        </>
      }
    >
      <div className="rise flex min-h-full flex-col justify-end gap-8 pb-4">
        <p className="label text-accent" style={{ '--i': 0 } as React.CSSProperties}>
          {reason}
        </p>
        <h1
          className="display text-[clamp(4.5rem,26vw,9rem)]"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          {da.game.finished}
        </h1>
        <dl
          className="grid grid-cols-3 gap-4 border-t border-raise-2 pt-6"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="display text-5xl">{s.value}</dd>
              <dt className="label mt-2 text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </ScreenLayout>
  )
}
