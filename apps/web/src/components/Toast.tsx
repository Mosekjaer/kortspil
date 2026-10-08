import { useEffect } from 'react'

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return (
    <div className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[var(--z-toast)]">
      <div className="column px-4">
        <div
          role="alert"
          className="sheet-in rounded-2xl bg-paper px-4 py-3 text-center text-lg font-semibold text-ink shadow-xl"
        >
          {message}
        </div>
      </div>
    </div>
  )
}
