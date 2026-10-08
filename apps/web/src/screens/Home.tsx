import type { Card } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { IconButton } from '../components/Icon'
import { CardFace } from '../components/PlayingCard'
import { da } from '../i18n/da'

const HAND: Card[] = [
  { id: 'h1', suit: 'hearts', rank: 13 },
  { id: 'h2', suit: 'spades', rank: 14 },
  { id: 'h3', suit: 'diamonds', rank: 8 },
]
const FAN = [
  '-rotate-[13deg] -translate-x-[62%]',
  '-translate-x-1/2 -translate-y-[5%]',
  'rotate-[13deg] -translate-x-[38%]',
]

export function Home() {
  const go = useApp((s) => s.go)
  return (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex min-h-16 items-center justify-end px-2">
        <IconButton
          icon="settings"
          label={da.home.settings}
          onClick={() => go({ name: 'settings' })}
        />
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col justify-between px-4">
        <h1 className="display rise text-[clamp(4rem,22vw,9rem)]">
          <span className="block" style={{ '--i': 0 } as React.CSSProperties}>
            {da.home.titleTop}
          </span>
          <span className="block text-accent" style={{ '--i': 1 } as React.CSSProperties}>
            {da.home.titleBottom}
          </span>
        </h1>

        <div className="fan relative mx-auto mb-4 aspect-[5/4] h-[min(30dvh,62vw)]" aria-hidden>
          {HAND.map((card, i) => (
            <div
              key={card.id}
              className="absolute bottom-0 left-1/2 w-[46%]"
              style={{ '--i': i, zIndex: i === 1 ? 1 : 0 } as React.CSSProperties}
            >
              <div className={`origin-bottom ${FAN[i]}`} style={{ containerType: 'inline-size' }}>
                <CardFace card={card} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="rise flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          className="min-h-18 text-xl"
          style={{ '--i': 2 } as React.CSSProperties}
          onClick={() => go({ name: 'picker' })}
        >
          {da.home.single}
        </Button>
        <div className="grid grid-cols-2 gap-3" style={{ '--i': 3 } as React.CSSProperties}>
          <Button variant="secondary" onClick={() => go({ name: 'create' })}>
            {da.home.create}
          </Button>
          <Button variant="secondary" onClick={() => go({ name: 'join' })}>
            {da.home.join}
          </Button>
        </div>
        <p className="label text-center text-muted" style={{ '--i': 4 } as React.CSSProperties}>
          {da.home.multiHint}
        </p>
      </footer>
    </div>
  )
}
