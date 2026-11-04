import type { ReactNode } from 'react'
import type { ComplaintCategory, Severity } from '../../lib/types'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../lib/types'
import { CategoryIcon } from '../../components/Icon'
import { severityColor } from './mapUtils'

/** Spanish display label for each severity (UI never renders raw union values). */
const SEVERITY_CHIP_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const CHIP_BASE =
  'inline-flex min-h-[2.25rem] cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
const CHIP_IDLE = 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
const CHIP_ACTIVE = 'border-slate-900 bg-slate-900 text-paper'

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
  /** Decorative glyph shown before the label; hidden from the a11y tree. */
  icon?: ReactNode
}

/** Toggleable pill filter exposing its state through aria-pressed. */
function Chip({ label, active, onClick, icon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
    >
      {icon}
      {label}
    </button>
  )
}

type FilterGroupProps = {
  title: string
  children: ReactNode
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <div role="group" aria-label={title}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
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
 * Filter stack of the map side panel: category, severity and comuna pills plus
 * a "Limpiar filtros" action that only appears while any filter is active.
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-slate-900">Filtros</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="cursor-pointer rounded-md px-1 text-sm font-semibold text-pulse-600 underline underline-offset-4 hover:text-pulse-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-600"
          >
            Limpiar filtros
          </button>
        )}
      </div>
      <FilterGroup title="Categoría">
        {ALL_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            icon={<CategoryIcon category={category} className="h-4 w-4" />}
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
            icon={
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full ring-2 ring-white/70"
                style={{ backgroundColor: severityColor(severity) }}
              />
            }
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
    </div>
  )
}
