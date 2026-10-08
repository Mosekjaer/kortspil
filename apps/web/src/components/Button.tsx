import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-ink',
  secondary: 'bg-raise text-paper active:bg-raise-2',
  ghost: 'bg-transparent text-paper active:bg-raise',
  outline: 'bg-transparent text-paper ring-2 ring-inset ring-paper/80 active:bg-raise',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`press min-h-14 rounded-full px-6 text-lg font-semibold select-none disabled:opacity-35 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
