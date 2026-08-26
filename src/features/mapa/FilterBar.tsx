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
 * Visual skin of a chip: quiet by default, its color family appears only on
 * hover or selection (bottom-border accent plus a soft translucent wash).
 */
type ChipSkin = {
  /** Neutral idle classes (slate bottom border, transparent background). */
  idle: string
  /** Classes that awaken the chip's color while hovered. */
  hover: string
  /** Classes while selected via aria-pressed=true. */
  active: string
  /** Focus ring color matching the chip's family. */
  focus: string
}

/** Builds the three color states of a chip from its Tailwind color name. */
/**
 * One skin per Tailwind color family. Every class is a complete literal:
 * Tailwind's JIT only detects whole class names in the source, so these
 * must never be built dynamically.
 */
const CHIP_SKINS = {
  rose: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-rose-500 hover:bg-rose-500/10 hover:text-rose-700',
    active: 'border-rose-500 bg-rose-500/10 font-semibold text-rose-700',
    focus: 'focus-visible:outline-rose-600',
  },
  blue: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-700',
    active: 'border-blue-500 bg-blue-500/10 font-semibold text-blue-700',
    focus: 'focus-visible:outline-blue-600',
  },
  amber: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-700',
    active: 'border-amber-500 bg-amber-500/10 font-semibold text-amber-700',
    focus: 'focus-visible:outline-amber-600',
  },
  slate: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-slate-500 hover:bg-slate-500/10 hover:text-slate-700',
    active: 'border-slate-500 bg-slate-500/10 font-semibold text-slate-700',
    focus: 'focus-visible:outline-slate-600',
  },
  emerald: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-700',
    active: 'border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700',
    focus: 'focus-visible:outline-emerald-600',
  },
  violet: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-700',
    active: 'border-violet-500 bg-violet-500/10 font-semibold text-violet-700',
    focus: 'focus-visible:outline-violet-600',
  },
  green: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-green-500 hover:bg-green-500/10 hover:text-green-700',
    active: 'border-green-500 bg-green-500/10 font-semibold text-green-700',
    focus: 'focus-visible:outline-green-600',
  },
  yellow: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-700',
    active: 'border-yellow-500 bg-yellow-500/10 font-semibold text-yellow-700',
    focus: 'focus-visible:outline-yellow-600',
  },
  orange: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-700',
    active: 'border-orange-500 bg-orange-500/10 font-semibold text-orange-700',
    focus: 'focus-visible:outline-orange-600',
  },
  red: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-red-500 hover:bg-red-500/10 hover:text-red-700',
    active: 'border-red-500 bg-red-500/10 font-semibold text-red-700',
    focus: 'focus-visible:outline-red-600',
  },
  teal: {
    idle: 'border-slate-300 bg-transparent text-slate-600',
    hover: 'hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-700',
    active: 'border-teal-500 bg-teal-500/10 font-semibold text-teal-700',
    focus: 'focus-visible:outline-teal-600',
  },
} as const satisfies Readonly<Record<string, ChipSkin>>

/** Per-category skins: each complaint type awakens its own color personality. */
const CATEGORY_CHIP_SKINS: Readonly<Record<ComplaintCategory, ChipSkin>> = {
  seguridad: CHIP_SKINS.rose,
  alcantarillado: CHIP_SKINS.blue,
  energia: CHIP_SKINS.amber,
  vias: CHIP_SKINS.slate,
  espacios_publicos: CHIP_SKINS.emerald,
  otros: CHIP_SKINS.violet,
}

/** Traffic-light skins for severities, mirroring the marker colors. */
const SEVERITY_CHIP_SKINS: Readonly<Record<Severity, ChipSkin>> = {
  baja: CHIP_SKINS.green,
  media: CHIP_SKINS.yellow,
  alta: CHIP_SKINS.orange,
  critica: CHIP_SKINS.red,
}

/** Brand-colored skin for comuna chips. */
const COMUNA_CHIP_SKIN: ChipSkin = CHIP_SKINS.teal

const CHIP_BASE =
  'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-none border-b-2 px-2 py-0.5 text-sm font-normal transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
  /** Color personality of the chip (idle/hover/selected states). */
  skin: ChipSkin
  /** Decorative glyph shown before the label; hidden from the a11y tree. */
  icon?: ReactNode
}

/**
 * Toggleable underline-style filter chip exposing its state through
 * aria-pressed: neutral until hovered or chosen, colored afterwards.
 */
function Chip({ label, active, onClick, skin, icon }: ChipProps) {
  const stateClasses = active ? skin.active : `${skin.idle} ${skin.hover}`
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${CHIP_BASE} ${skin.focus} ${stateClasses}`}
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
