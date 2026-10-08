import type { ReactNode } from 'react'
import { da } from '../i18n/da'

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[var(--z-sheet)] flex flex-col justify-end"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        type="button"
        aria-label={da.close}
        className="fade-in absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="sheet-in column relative max-h-[82dvh] overflow-y-auto rounded-t-[2rem] bg-raise px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-raise-2" />
        <h2 className="display mb-4 text-4xl">{title}</h2>
        {children}
      </div>
    </div>
  )
}
