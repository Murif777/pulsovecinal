import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../../lib/types'
import type { ComplaintCategory } from '../../../lib/types'
import { SEVERITY_LABELS } from '../dashboardUtils'
import type { DashboardFilters, DatePreset } from '../filterUtils'
import { activeFilterCount, EMPTY_FILTERS, presetRange, toggleInList } from '../filterUtils'
import type { RankingSort, RankingSortKey } from '../reportUtils'
import PanelSection from './PanelSection'
import ToggleChip from './ToggleChip'

export type DashboardView = 'resumen' | 'reportes' | 'barrios'

const CATEGORY_ICONS: Readonly<Record<ComplaintCategory, string>> = {
  seguridad: '🔒',
  alcantarillado: '💧',
  energia: '⚡',
  vias: '🛣️',
  espacios_publicos: '🌳',
  otros: '📋',
}

const VIEW_OPTIONS: readonly { id: DashboardView; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'barrios', label: 'Barrios' },
]

const PRESET_OPTIONS: readonly { id: DatePreset; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '15d', label: '15 días' },
  { id: 'all', label: 'Todo' },
]

const RANKING_SORT_OPTIONS: readonly { id: RankingSortKey; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'totalCount', label: 'N.º reportes' },
  { id: 'barrio', label: 'Nombre' },
]

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'

function formatSessionTime(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  const time = iso.slice(11, 16)
  return `${day}/${month}/${year} ${time}`
}

export type ControlPanelProps = {
  view: DashboardView
  onViewChange: (view: DashboardView) => void
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  rankingSort: RankingSort
  onRankingSortChange: (sort: RankingSort) => void
  comunaOptions: readonly string[]
  /** Inclusive YYYY-MM-DD bounds of the unfiltered dataset, used as date input limits. */
  bounds: { readonly start: string; readonly end: string }
  citizenCount: number
  onExportCsv: () => void
  session: { readonly username: string; readonly loggedInAt: string } | null
  onLogout: () => void
}

/**
 * Sticky left-hand control panel: view switcher, search, period, multi-select
 * filters, citizen-source toggle, ranking order and export.
 */
export default function ControlPanel({
  view,
  onViewChange,
  filters,
  onFiltersChange,
  rankingSort,
  onRankingSortChange,
  comunaOptions,
  bounds,
  citizenCount,
  onExportCsv,
  session,
  onLogout,
}: ControlPanelProps) {
  const filterCount = activeFilterCount(filters)

  const applyPreset = (preset: DatePreset) => {
    const range = preset === 'all' ? { from: null, to: null } : presetRange(preset, new Date(`${bounds.end}T00:00:00.000Z`))
    onFiltersChange({ ...filters, from: range.from, to: range.to })
  }

  const activePreset: DatePreset | null = (() => {
    if (filters.from === null && filters.to === null) {
      return 'all'
    }
    const seven = presetRange('7d', new Date(`${bounds.end}T00:00:00.000Z`))
    if (filters.from === seven.from && filters.to === seven.to) {
      return '7d'
    }
    const fifteen = presetRange('15d', new Date(`${bounds.end}T00:00:00.000Z`))
    if (filters.from === fifteen.from && filters.to === fifteen.to) {
      return '15d'
    }
    return null
  })()

  return (
    <aside
      aria-label="Panel de control"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:sticky lg:top-20"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Controles</h2>
        {filterCount > 0 && (
          <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {filterCount} activo{filterCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <section aria-label="Sesión" className="mt-3 rounded-lg border border-teal-200 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Sesión</p>
        {session === null ? (
          <p className="mt-1 text-sm text-slate-500">No hay una sesión activa.</p>
        ) : (
          <>
            <p className="mt-1 text-sm font-semibold text-slate-900">{session.username}</p>
            <p className="text-xs text-slate-500">Ingreso: {formatSessionTime(session.loggedInAt)}</p>
          </>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Cerrar sesión
        </button>
      </section>

      <PanelSection title="Vista">
        <div role="group" aria-label="Vista del dashboard" className="flex flex-wrap gap-1.5">
          {VIEW_OPTIONS.map((option) => (
            <ToggleChip
              key={option.id}
              label={option.label}
              active={view === option.id}
              onClick={() => onViewChange(option.id)}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Buscar barrio">
        <label htmlFor="dashboard-search" className="sr-only">
          Buscar barrio o descripción
        </label>
        <input
          id="dashboard-search"
          type="search"
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder="Barrio o descripción…"
          className={inputClass}
        />
      </PanelSection>

      <PanelSection title="Periodo">
        <div role="group" aria-label="Periodo predefinido" className="flex flex-wrap gap-1.5">
          {PRESET_OPTIONS.map((option) => (
            <ToggleChip
              key={option.id}
              label={option.label}
              active={activePreset === option.id}
              onClick={() => applyPreset(option.id)}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="dashboard-from" className="block text-[11px] font-medium text-slate-500">
              Desde
            </label>
            <input
              id="dashboard-from"
              type="date"
              min={bounds.start || undefined}
              max={bounds.end || undefined}
              value={filters.from ?? ''}
              onChange={(event) =>
                onFiltersChange({ ...filters, from: event.target.value === '' ? null : event.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dashboard-to" className="block text-[11px] font-medium text-slate-500">
              Hasta
            </label>
            <input
              id="dashboard-to"
              type="date"
              min={bounds.start || undefined}
              max={bounds.end || undefined}
              value={filters.to ?? ''}
              onChange={(event) =>
                onFiltersChange({ ...filters, to: event.target.value === '' ? null : event.target.value })
              }
              className={inputClass}
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Comuna" count={filters.comunas.length}>
        <div role="group" aria-label="Filtrar por comuna" className="flex flex-wrap gap-1.5">
          {comunaOptions.map((comuna) => (
            <ToggleChip
              key={comuna}
              label={comuna}
              active={filters.comunas.includes(comuna)}
              onClick={() => onFiltersChange({ ...filters, comunas: toggleInList(filters.comunas, comuna) })}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Categoría" count={filters.categories.length} defaultOpen={false}>
        <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((category) => (
            <ToggleChip
              key={category}
              label={CATEGORY_LABELS[category]}
              icon={<span aria-hidden="true">{CATEGORY_ICONS[category]}</span>}
              active={filters.categories.includes(category)}
              onClick={() =>
                onFiltersChange({ ...filters, categories: toggleInList(filters.categories, category) })
              }
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Severidad" count={filters.severities.length} defaultOpen={false}>
        <div role="group" aria-label="Filtrar por severidad" className="flex flex-wrap gap-1.5">
          {ALL_SEVERITIES.map((severity) => (
            <ToggleChip
              key={severity}
              label={SEVERITY_LABELS[severity]}
              active={filters.severities.includes(severity)}
              onClick={() =>
                onFiltersChange({ ...filters, severities: toggleInList(filters.severities, severity) })
              }
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Fuente de datos">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.includeCitizen}
            onChange={(event) => onFiltersChange({ ...filters, includeCitizen: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          <span>
            Incluir reportes ciudadanos
            <span className="mt-0.5 block text-xs text-slate-500">
              {citizenCount === 0
                ? 'Ninguno guardado en este navegador'
                : `${citizenCount} ${citizenCount === 1 ? 'reporte' : 'reportes'} en localStorage`}
            </span>
          </span>
        </label>
      </PanelSection>

      {(view === 'resumen' || view === 'barrios') && (
        <PanelSection title="Orden del ranking">
          <div role="group" aria-label="Ordenar ranking por" className="flex flex-wrap gap-1.5">
            {RANKING_SORT_OPTIONS.map((option) => (
              <ToggleChip
                key={option.id}
                label={option.label}
                active={rankingSort.key === option.id}
                onClick={() => onRankingSortChange({ ...rankingSort, key: option.id })}
              />
            ))}
          </div>
          <div role="group" aria-label="Dirección del ranking" className="mt-2 flex flex-wrap gap-1.5">
            <ToggleChip
              label="Descendente"
              active={rankingSort.direction === 'desc'}
              onClick={() => onRankingSortChange({ ...rankingSort, direction: 'desc' })}
            />
            <ToggleChip
              label="Ascendente"
              active={rankingSort.direction === 'asc'}
              onClick={() => onRankingSortChange({ ...rankingSort, direction: 'asc' })}
            />
          </div>
        </PanelSection>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          disabled={filterCount === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Limpiar filtros
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Exportar CSV
        </button>
      </div>
    </aside>
  )
}
