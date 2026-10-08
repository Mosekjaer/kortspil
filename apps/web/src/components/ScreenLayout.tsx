import type { ReactNode } from 'react'
import { da } from '../i18n/da'
import { IconButton } from './Icon'

/** Header, scrolling body and a thumb-reachable footer. */
export function ScreenLayout({
  title,
  onBack,
  right,
  footer,
  children,
}: {
  title?: ReactNode
  onBack?: () => void
  right?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)]">
      {(title || onBack || right) && (
        <header className="flex min-h-16 items-center gap-1 px-2">
          {onBack ? (
            <IconButton icon="chevron-left" label={da.back} onClick={onBack} />
          ) : (
            <span className="w-3" />
          )}
          <h1 className="label flex-1 truncate text-muted">{title}</h1>
          {right}
        </header>
      )}
      <main className="flex-1 overflow-y-auto px-4 pb-4">{children}</main>
      {footer && (
        <footer className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      )}
    </div>
  )
}

/** The one loud line on a screen. */
export function Display({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`display text-[clamp(2.75rem,13.5vw,6rem)] hyphens-auto ${className}`}>
      {children}
    </h2>
  )
}
