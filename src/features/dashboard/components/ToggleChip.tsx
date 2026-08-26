import type { ReactNode } from 'react'

type ToggleChipProps = {
  label: string
  active: boolean
  onClick: () => void
  /** Decorative glyph shown before the label; hidden from the a11y tree. */
  icon?: ReactNode
}

const BASE =
  'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600'

/**
 * Compact toggleable chip for the dashboard control panel.
 * State is exposed through aria-pressed, matching the map filter chips.
 */
export default function ToggleChip({ label, active, onClick, icon }: ToggleChipProps) {
  const state = active
    ? 'border-teal-600 bg-teal-700 text-white'
    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${BASE} ${state}`}>
      {icon}
      {label}
    </button>
  )
}
