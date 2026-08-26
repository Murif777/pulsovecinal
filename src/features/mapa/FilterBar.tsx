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

/** Visual skin of a chip: soft translucent tints of its own color family. */
type ChipSkin = {
  /** Classes while inactive (10% tint, hover deepens to 15%). */
  inactive: string
  /** Classes while active (20% tint, bolder text, inset ring at 30%). */
  active: string
  /** Focus ring color matching the chip's family. */
  focus: string
}

/**
 * Per-category skins: each complaint type keeps its color personality as a
 * translucent wash instead of a solid fill (all pairings keep AA contrast).
 */
const CATEGORY_CHIP_SKINS: Readonly<Record<ComplaintCategory, ChipSkin>> = {
  seguridad: {
    inactive: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15',
    active: 'bg-rose-500/20 font-semibold text-rose-800 ring-1 ring-inset ring-rose-500/30',
    focus: 'focus-visible:outline-rose-600',
  },
  alcantarillado: {
    inactive: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/15',
    active: 'bg-blue-500/20 font-semibold text-blue-800 ring-1 ring-inset ring-blue-500/30',
    focus: 'focus-visible:outline-blue-600',
  },
  energia: {
    inactive: 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/15',
    active: 'bg-amber-500/20 font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/30',
    focus: 'focus-visible:outline-amber-600',
  },
  vias: {
    inactive: 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/15',
    active: 'bg-slate-500/20 font-semibold text-slate-800 ring-1 ring-inset ring-slate-500/30',
    focus: 'focus-visible:outline-slate-600',
  },
  espacios_publicos: {
    inactive: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15',
    active: 'bg-emerald-500/20 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-500/30',
    focus: 'focus-visible:outline-emerald-600',
  },
  otros: {
    inactive: 'bg-violet-500/10 text-violet-700 hover:bg-violet-500/15',
    active: 'bg-violet-500/20 font-semibold text-violet-800 ring-1 ring-inset ring-violet-500/30',
    focus: 'focus-visible:outline-violet-600',
  },
}

/** Traffic-light skins for severities, mirroring the marker colors. */
const SEVERITY_CHIP_SKINS: Readonly<Record<Severity, ChipSkin>> = {
  baja: {
    inactive: 'bg-green-500/10 text-green-700 hover:bg-green-500/15',
    active: 'bg-green-500/20 font-semibold text-green-800 ring-1 ring-inset ring-green-500/30',
    focus: 'focus-visible:outline-green-600',
  },
  media: {
    inactive: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15',
    active: 'bg-yellow-500/20 font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-500/30',
    focus: 'focus-visible:outline-yellow-600',
  },
  alta: {
    inactive: 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/15',
    active: 'bg-orange-500/20 font-semibold text-orange-800 ring-1 ring-inset ring-orange-500/30',
    focus: 'focus-visible:outline-orange-600',
  },
  critica: {
    inactive: 'bg-red-500/10 text-red-700 hover:bg-red-500/15',
    active: 'bg-red-500/20 font-semibold text-red-800 ring-1 ring-inset ring-red-500/30',
    focus: 'focus-visible:outline-red-600',
  },
}

/** Brand-colored skin for comuna chips. */
const COMUNA_CHIP_SKIN: ChipSkin = {
  inactive: 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/15',
  active: 'bg-teal-500/20 font-semibold text-teal-800 ring-1 ring-inset ring-teal-500/30',
  focus: 'focus-visible:outline-teal-600',
}

const CHIP_BASE =
  'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
  /** Color personality of the chip (tints, ring and focus color). */
  skin: ChipSkin
  /** Decorative glyph shown before the label; hidden from the a11y tree. */
  icon?: ReactNode
}

/** Toggleable link-style filter chip exposing its state through aria-pressed. */
function Chip({ label, active, onClick, skin, icon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${CHIP_BASE} ${skin.focus} ${active ? skin.active : skin.inactive}`}
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
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </span>
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
 * chips plus a "Limpiar filtros" link that only shows up while any filter
 * is active. Groups flow inline on a light translucent strip — no boxed cards.
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
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-white/60 px-3 py-2.5 backdrop-blur-sm">
      <FilterGroup title="Categoría">
        {ALL_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            icon={<span aria-hidden="true">{CATEGORY_ICONS[category]}</span>}
            active={selectedCategories.includes(category)}
            onClick={() => onToggleCategory(category)}
            skin={CATEGORY_CHIP_SKINS[category]}
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
            skin={SEVERITY_CHIP_SKINS[severity]}
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
            skin={COMUNA_CHIP_SKIN}
          />
        ))}
      </FilterGroup>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="ml-auto cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-rose-600 underline-offset-2 transition-colors duration-150 hover:text-rose-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
