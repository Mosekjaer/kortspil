/** Words rise out of their own masks, staggered. Text stays readable without animation. */
export function SplitWords({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i}>
            <span className="split-word">
              <span style={{ '--i': i } as React.CSSProperties}>{w}</span>
            </span>{' '}
          </span>
        ))}
      </span>
    </span>
  )
}
