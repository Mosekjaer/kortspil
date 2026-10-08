import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

const ROW = 64 // h-14 (56px) + gap-2 (8px)

/**
 * Vertical list reordered by dragging the grip handle. Move/up listeners live on
 * window because reordering moves the DOM node, which drops pointer capture.
 * Rows have a fixed height to keep the maths trivial.
 */
export function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
}: {
  items: T[]
  getKey: (item: T) => string
  onReorder: (items: T[]) => void
  renderItem: (item: T) => ReactNode
}) {
  const [drag, setDrag] = useState<{ key: string; offset: number } | null>(null)
  const latest = useRef({ items, onReorder, getKey })
  latest.current = { items, onReorder, getKey }
  const cleanup = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanup.current?.(), [])

  const onPointerDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault()
    const startY = e.clientY
    const startIndex = items.findIndex((i) => getKey(i) === key)
    setDrag({ key, offset: 0 })

    const move = (ev: PointerEvent) => {
      const { items: current, onReorder: reorder, getKey: keyOf } = latest.current
      const dy = ev.clientY - startY
      const to = Math.max(0, Math.min(current.length - 1, startIndex + Math.round(dy / ROW)))
      const from = current.findIndex((i) => keyOf(i) === key)
      if (from !== -1 && to !== from) {
        const next = current.slice()
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved!)
        latest.current.items = next
        reorder(next)
      }
      setDrag({ key, offset: dy - (to - startIndex) * ROW })
    }
    const up = () => {
      cleanup.current?.()
      setDrag(null)
    }
    cleanup.current?.()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    cleanup.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      cleanup.current = null
    }
  }

  return (
    <ul className="flex flex-col gap-2 select-none">
      {items.map((item) => {
        const key = getKey(item)
        const dragging = drag?.key === key
        return (
          <li
            key={key}
            className={`flex h-14 items-center gap-2 rounded-2xl bg-raise pr-2 ${dragging ? 'relative z-[var(--z-raised)] shadow-xl ring-2 ring-accent' : ''}`}
            style={dragging ? { transform: `translateY(${drag.offset}px)` } : undefined}
          >
            <span
              className="flex h-full w-12 cursor-grab touch-none items-center justify-center text-muted"
              onPointerDown={(e) => onPointerDown(e, key)}
              aria-hidden
            >
              <Icon name="grip-vertical" size={22} />
            </span>
            {renderItem(item)}
          </li>
        )
      })}
    </ul>
  )
}
