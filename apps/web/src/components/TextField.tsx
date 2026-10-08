import type { InputHTMLAttributes, Ref } from 'react'

/** Label above, input below; errors go under the field. */
export function TextField({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  ref?: Ref<HTMLInputElement>
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="label text-muted">{label}</span>
      <input
        className="min-h-14 rounded-2xl bg-raise px-4 text-lg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        {...props}
      />
      {error && (
        <span role="alert" className="font-semibold text-paper">
          {error}
        </span>
      )}
    </label>
  )
}
