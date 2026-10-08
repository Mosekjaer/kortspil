import { useState } from 'react'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { CardBack } from '../components/PlayingCard'
import { da } from '../i18n/da'
import { useSettings } from '../settings'

const FLIP_MS = 650

/** First-run gate. Confirming turns the card over before the app opens. */
export function AgeGate() {
  const update = useSettings((s) => s.update)
  const go = useApp((s) => s.go)
  const [opening, setOpening] = useState(false)

  const confirm = (then?: () => void) => {
    setOpening(true)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(
      () => {
        update({ ageConfirmed: true })
        then?.()
      },
      reduced ? 0 : FLIP_MS,
    )
  }

  return (
    <div className="fixed inset-0 z-[var(--z-gate)] bg-ink">
      <div className="column flex h-full flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rise flex flex-1 flex-col justify-center gap-6">
          <div className="card-size mx-auto" style={{ '--i': 0 } as React.CSSProperties}>
            <div className={`flip-inner ${opening ? 'is-flipped' : ''}`}>
              <div className="flip-face">
                <CardBack />
              </div>
              <div className="flip-face flip-front">
                <div className="card-shape flex items-center justify-center bg-card text-card-black">
                  <span className="display text-[42cqw]">18+</span>
                </div>
              </div>
            </div>
          </div>
          <h1 className="display text-6xl" style={{ '--i': 1 } as React.CSSProperties}>
            {da.ageGate.title}
          </h1>
          <div
            className="flex flex-col gap-3 text-lg text-muted"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <p>{da.ageGate.body}</p>
            <p>{da.ageGate.responsible}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button className="min-h-18 text-xl" disabled={opening} onClick={() => confirm()}>
            {da.ageGate.confirm}
          </Button>
          <Button
            variant="ghost"
            disabled={opening}
            onClick={() => confirm(() => go({ name: 'settings' }))}
          >
            {da.ageGate.toPenalty}
          </Button>
        </div>
      </div>
    </div>
  )
}
