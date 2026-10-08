// Tabler Icons 3.49.0 outline (MIT), copied verbatim.
const PATHS = {
  settings: [
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065',
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  ],
  'chevron-left': ['M15 6l-6 6l6 6'],
  dots: [
    'M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  ],
  x: ['M18 6l-12 12', 'M6 6l12 12'],
  'grip-vertical': [
    'M8 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M8 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M14 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  ],
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 26 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press flex size-14 items-center justify-center rounded-full text-paper active:bg-raise"
    >
      <Icon name={icon} />
    </button>
  )
}
