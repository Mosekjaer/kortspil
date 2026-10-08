import type { ReactNode } from 'react'

export function Chip({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  const cls = `rounded-full px-3 py-1.5 text-sm font-semibold ${active ? 'bg-accent text-ink' : 'bg-raise text-paper'}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`press ${cls} active:bg-raise-2`}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  )
}
