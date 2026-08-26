type ComunaFilterProps = {
  options: readonly string[]
  /** Currently selected comuna; null means "all comunas". */
  selected: string | null
  onSelect: (comuna: string | null) => void
}

const baseChip =
  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600'

function chipClassName(active: boolean): string {
  return active
    ? `${baseChip} bg-teal-700 text-white`
    : `${baseChip} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`
}

/**
 * Presentational single-select comuna filter: a "Todas" chip plus one chip
 * per comuna. Clicking the active comuna again deactivates it (back to all).
 */
export default function ComunaFilter({ options, selected, onSelect }: ComunaFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por comuna" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
        className={chipClassName(selected === null)}
      >
        Todas
      </button>
      {options.map((comuna) => (
        <button
          key={comuna}
          type="button"
          aria-pressed={selected === comuna}
          onClick={() => onSelect(selected === comuna ? null : comuna)}
          className={chipClassName(selected === comuna)}
        >
          {comuna}
        </button>
      ))}
    </div>
  )
}