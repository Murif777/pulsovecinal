import type { ReactNode } from 'react'
import type { ComplaintCategory, Severity } from '../../lib/types'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../lib/types'
import { CATEGORY_ICONS, severityColor } from './mapUtils'

/** Spanish display label for each severity (UI never renders raw union values). */
const SEVERITY_CHIP_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

/**
 * Filled look of an ACTIVE category chip: each category gets its own color
 * personality (all pairings keep AA text contrast on their fill).
 */
const CATEGORY_CHIP_ACTIVE: Readonly<Record<ComplaintCategory, string>> = {
  seguridad: 'border-transparent bg-rose-600 text-white',
  alcantarillado: 'border-transparent bg-blue-600 text-white',
  energia: 'border-transparent bg-amber-400 text-amber-950',
  vias: 'border-transparent bg-slate-600 text-white',
  espacios_publicos: 'border-transparent bg-emerald-700 text-white',
  otros: 'border-transparent bg-violet-600 text-white',
}

/** Filled look of an ACTIVE severity chip: the traffic-light as filter state. */
const SEVERITY_CHIP_ACTIVE: Readonly<Record<Severity, string>> = {
  baja: 'border-transparent bg-green-700 text-white',
  media: 'border-transparent bg-yellow-400 text-yellow-950',
  alta: 'border-transparent bg-orange-500 text-orange-950',
  critica: 'border-transparent bg-red-600 text-white',
}

const CHIP_BASE =
  'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600'

const CHIP_INACTIVE =
  'border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
  /** Classes applied while active (the chip's color personality). */
  activeClassName: string
  /** Decorative glyph shown before the label; hidden from the a11y tree. */
  icon?: ReactNode
}

/** Toggleable filter chip exposing its state through aria-pressed. */
function Chip({ label, active, onClick, activeClassName, icon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${CHIP_BASE} ${active ? `${activeClassName} shadow-sm` : CHIP_INACTIVE}`}
    >
      {icon}
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
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
    <div className="sticky top-16 z-20 space-y-3 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
      <FilterGroup title="Categoría">
        {ALL_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            icon={<span aria-hidden="true">{CATEGORY_ICONS[category]}</span>}
            active={selectedCategories.includes(category)}
            onClick={() => onToggleCategory(category)}
            activeClassName={CATEGORY_CHIP_ACTIVE[category]}
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
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: severityColor(severity) }}
              />
            }
            active={selectedSeverities.includes(severity)}
            onClick={() => onToggleSeverity(severity)}
            activeClassName={SEVERITY_CHIP_ACTIVE[severity]}
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
            activeClassName="border-transparent bg-teal-700 text-white"
          />
        ))}
      </FilterGroup>
      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
