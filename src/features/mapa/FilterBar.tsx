import type { ReactNode } from 'react'
import type { ComplaintCategory, Severity } from '../../lib/types'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../lib/types'

/** Spanish display label for each severity (UI never renders raw union values). */
const SEVERITY_CHIP_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
}

/** Toggleable filter chip exposing its state through aria-pressed. */
function Chip({ label, active, onClick }: ChipProps) {
  const base =
    'rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? `${base} bg-teal-700 text-white`
          : `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`
      }
    >
      {label}
    </button>
  )
}

type FilterGroupProps = {
  /** Group title rendered before its chips. */
  title: string
  children: ReactNode
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      {children}
    </div>
  )
}

type FilterBarProps = {
  selectedCategories: readonly ComplaintCategory[]
  selectedSeverities: readonly Severity[]
  selectedComunas: readonly string[]
  /** Comuna values available in the dataset, rendered as chips. */
  comunaOptions: readonly string[]
  onToggleCategory: (category: ComplaintCategory) => void
  onToggleSeverity: (severity: Severity) => void
  onToggleComuna: (comuna: string) => void
  onClearFilters: () => void
}

/**
 * Presentational filter bar above the map: category, severity and comuna
 * chips plus a "Limpiar filtros" button that only shows up while any filter
 * is active.
 */
export default function FilterBar({
  selectedCategories,
  selectedSeverities,
  selectedComunas,
  comunaOptions,
  onToggleCategory,
  onToggleSeverity,
  onToggleComuna,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    selectedCategories.length > 0 || selectedSeverities.length > 0 || selectedComunas.length > 0

  return (
    <div className="sticky top-16 z-20 space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <FilterGroup title="Categoría">
        {ALL_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            active={selectedCategories.includes(category)}
            onClick={() => onToggleCategory(category)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Severidad">
        {ALL_SEVERITIES.map((severity) => (
          <Chip
            key={severity}
            label={SEVERITY_CHIP_LABELS[severity]}
            active={selectedSeverities.includes(severity)}
            onClick={() => onToggleSeverity(severity)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Comuna">
        {comunaOptions.map((comuna) => (
          <Chip
            key={comuna}
            label={comuna}
            active={selectedComunas.includes(comuna)}
            onClick={() => onToggleComuna(comuna)}
          />
        ))}
      </FilterGroup>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
