import { useEffect, useRef, useState } from 'react'
import { colorOf, type Card } from '@kortspil/core'
import { SUIT_SYMBOL, da } from '../i18n/da'

/** Card face. Suit symbols differ in shape, so colour is never the only cue. */
export function CardFace({ card }: { card: Card }) {
  const red = colorOf(card.suit) === 'red'
  const rank = da.card.short(card.rank)
  const suit = SUIT_SYMBOL[card.suit]
  const corner = (
    <span className="flex flex-col items-center leading-none">
      <span className="font-display text-[17cqw] leading-[0.9]">{rank}</span>
      <span className="text-[12cqw]">{suit}</span>
    </span>
  )
  return (
    <div
      className={`card-shape bg-card ${red ? 'text-card-red' : 'text-card-black'}`}
      role="img"
      aria-label={da.card.label(card)}
    >
      <div className="absolute top-[5cqw] left-[6cqw]">{corner}</div>
      <div className="absolute right-[6cqw] bottom-[5cqw] rotate-180">{corner}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        {card.rank > 10 ? (
          <span className="flex flex-col items-center">
            <span className="font-display text-[46cqw] leading-[0.85]">{rank}</span>
            <span className="text-[20cqw] leading-none">{suit}</span>
          </span>
        ) : (
          <span className="text-[52cqw] leading-none">{suit}</span>
        )}
      </div>
    </div>
  )
}

export function CardBack() {
  return <div className="card-shape card-back" role="img" aria-label={da.card.back} />
}

/**
 * Dealt from above, then flipped face-up. Give it `key={card.id}` so every new
 * card replays the sequence. Reduced motion shows the face immediately.
 */
export function FlipCard({ card, className = '' }: { card: Card; className?: string }) {
  const [up, setUp] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setUp(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`card-size deal ${className}`}>
      <div className={`flip-inner ${up ? 'is-flipped' : ''}`}>
        <div className="flip-face">
          <CardBack />
        </div>
        <div className="flip-face flip-front">
          <CardFace card={card} />
        </div>
      </div>
    </div>
  )
}

const DRAW_DISTANCE = 90

/**
 * The deck as a toy: tap it, or flick the top card upwards, to draw.
 * The card follows the finger with a little tilt and springs back if let go early.
 */
export function Deck({
  onDraw,
  disabled = false,
  label,
  remaining,
  children,
}: {
  onDraw: () => void
  disabled?: boolean
  label: string
  /** Cards left under the top one; the visible stack thins out as it shrinks. */
  remaining: number
  children: React.ReactNode
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const end = () => {
    const s = start.current
    start.current = null
    if (!s) return
    const pulled = drag !== null && -drag.y > DRAW_DISTANCE
    setDrag(null)
    if (!disabled && (pulled || !s.moved)) onDraw()
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="card-size relative block touch-none bg-transparent select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, y: e.clientY, moved: false }
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s) return
        const x = e.clientX - s.x
        const y = Math.min(0, e.clientY - s.y)
        if (Math.abs(x) + Math.abs(y) > 8) s.moved = true
        if (s.moved) setDrag({ x, y })
      }}
      onPointerUp={end}
      onPointerCancel={() => {
        start.current = null
        setDrag(null)
      }}
    >
      {remaining > 1 && (
        <div className="absolute inset-0 translate-x-[3%] translate-y-[3%] rotate-[3deg] opacity-50">
          <CardBack />
        </div>
      )}
      {remaining > 0 && (
        <div className="absolute inset-0 translate-x-[1.5%] translate-y-[1.5%] rotate-[1.5deg] opacity-75">
          <CardBack />
        </div>
      )}
      <div
        className="relative"
        style={{
          transform: drag
            ? `translate(${drag.x * 0.6}px, ${drag.y}px) rotate(${drag.x * 0.05}deg)`
            : undefined,
          transition: drag ? 'none' : 'transform var(--dur-base) var(--ease-house)',
        }}
      >
        {children}
      </div>
    </button>
  )
}
