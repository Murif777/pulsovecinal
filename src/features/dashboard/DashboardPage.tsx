import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardSummary, getMapReports, mockSurveyResponses } from '../../lib/mockData'
import { CATEGORY_LABELS } from '../../lib/types'
import { getSession, logout } from './auth'
import { loadCitizenResponses, mergeResponses } from './citizenReports'
import CategoryChart from './components/CategoryChart'
import ControlPanel from './components/ControlPanel'
import type { DashboardView } from './components/ControlPanel'
import EmptyState from './components/EmptyState'
import KpiCard from './components/KpiCard'
import RankingTable from './components/RankingTable'
import ReportDetail from './components/ReportDetail'
import ReportsTable from './components/ReportsTable'
import SeverityChart from './components/SeverityChart'
import TrendChart from './components/TrendChart'
import {
  buildRanking,
  categoryDistribution,
  comunaOptions,
  computeKpis,
  severityDistribution,
} from './dashboardUtils'
import {
  activeFilterChips,
  applyFilters,
  dateBounds,
  EMPTY_FILTERS,
  removeFilterChip,
} from './filterUtils'
import type { DashboardFilters } from './filterUtils'
import {
  DEFAULT_RANKING_SORT,
  DEFAULT_REPORT_SORT,
  PAGE_SIZE,
  paginate,
  sortRankingRows,
  sortReportRows,
  toCsv,
  toReportRows,
} from './reportUtils'
import type { RankingSort, ReportSort } from './reportUtils'
import { dailyTrend } from './trendUtils'

/** Decorative heartbeat glyph for the page eyebrow (the PulsoVecinal mark). */
function PulseMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12h4l3-8 4 16 3-8h6" />
    </svg>
  )
}

type SummaryBadgeProps = {
  icon: string
  children: ReactNode
}

/** Small stat pill of the live summary row under the heading. */
function SummaryBadge({ icon, children }: SummaryBadgeProps) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
      <span aria-hidden="true" className="text-xs">
        {icon}
      </span>
      <span className="text-slate-500">{children}</span>
    </li>
  )
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const VIEW_LABEL: Readonly<Record<DashboardView, string>> = {
  resumen: 'Resumen',
  reportes: 'Reportes',
  barrios: 'Barrios',
}

/**
 * /dashboard page: criticality dashboard of Valledupar barrios.
 * Owns filter / view / sort state and derives every view model through the
 * pure helpers, then hands presentational components the result.
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [view, setView] = useState<DashboardView>('resumen')
  const [rankingSort, setRankingSort] = useState<RankingSort>(DEFAULT_RANKING_SORT)
  const [reportSort, setReportSort] = useState<ReportSort>(DEFAULT_REPORT_SORT)
  const [page, setPage] = useState(1)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const citizenCount = loadCitizenResponses().length
  const bounds = useMemo(() => dateBounds(mockSurveyResponses), [])
  const comunaOptionsList = useMemo(() => comunaOptions(mockSurveyResponses), [])

  const merged = useMemo(
    () => mergeResponses(mockSurveyResponses, filters.includeCitizen),
    [filters.includeCitizen],
  )
  const filtered = useMemo(() => applyFilters(merged, filters), [merged, filters])
  const summary = useMemo(() => getDashboardSummary(filtered), [filtered])
  const kpis = useMemo(() => computeKpis(summary), [summary])
  const mapReports = useMemo(() => getMapReports(filtered), [filtered])
  const ranking = useMemo(() => buildRanking(summary, mapReports), [summary, mapReports])
  const sortedRanking = useMemo(
    () => sortRankingRows(ranking, rankingSort.key, rankingSort.direction),
    [ranking, rankingSort],
  )
  const categoryData = useMemo(() => categoryDistribution(summary), [summary])
  const severityData = useMemo(() => severityDistribution(summary), [summary])
  const trendData = useMemo(() => dailyTrend(filtered), [filtered])
  const reportRows = useMemo(
    () => sortReportRows(toReportRows(filtered), reportSort.key, reportSort.direction),
    [filtered, reportSort],
  )
  const pagedReports = useMemo(() => paginate(reportRows, page, PAGE_SIZE), [reportRows, page])
  const chips = useMemo(() => activeFilterChips(filters), [filters])

  useEffect(() => {
    if (pagedReports.page !== page) {
      setPage(pagedReports.page)
    }
  }, [pagedReports.page, page])

  const selectedRow = reportRows.find((row) => row.id === selectedReportId) ?? null
  const sourceTotal = merged.length
  const filteredAway = sourceTotal !== kpis.totalResponses
  const hint = filteredAway ? `de ${sourceTotal} en la fuente activa` : undefined

  const changeFilters = (next: DashboardFilters) => {
    setFilters(next)
    setPage(1)
    setSelectedReportId(null)
  }

  const drillIntoBarrio = (barrio: string) => {
    changeFilters({ ...EMPTY_FILTERS, search: barrio, includeCitizen: filters.includeCitizen })
    setView('reportes')
    setPanelOpen(false)
  }

  const comunaSummary =
    filters.comunas.length === 0
      ? 'Comuna activa: todas'
      : filters.comunas.length === 1
        ? `Comuna activa: ${filters.comunas[0]}`
        : `Comunas activas: ${filters.comunas.join(', ')}`

  const kpiGrid = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard icon="📊" label="Reportes totales" value={String(kpis.totalResponses)} hint={hint} />
      <KpiCard icon="📍" label="Barrios cubiertos" value={String(kpis.barriosCubiertos)} hint={hint} />
      <KpiCard
        icon="🏷️"
        label="Categoría más reportada"
        value={`${CATEGORY_LABELS[kpis.topCategory]} (${kpis.topCategoryCount})`}
      />
      <KpiCard icon="🚨" label="Reportes críticos" value={String(kpis.criticalCount)} tone="red" />
    </div>
  )

  const rankingBlock = (rows = sortedRanking) => (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Barrios más críticos</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ranking por score ponderado según la severidad de los reportes. Pulsa un barrio para ver sus reportes.
      </p>
      <div className="mt-3">
        <RankingTable
          rows={rows}
          sort={rankingSort}
          onSortChange={setRankingSort}
          onSelectBarrio={drillIntoBarrio}
        />
      </div>
    </div>
  )

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
        <PulseMark />
        PulsoVecinal · Valledupar
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Dashboard de criticidad
      </h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-500">
        Priorización de necesidades barriales — Valledupar
      </p>

      <ul aria-label="Resumen del dashboard" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <SummaryBadge icon="📅">
          Periodo: {summary.period.start.slice(0, 10) || '—'} → {summary.period.end.slice(0, 10) || '—'}
        </SummaryBadge>
        <SummaryBadge icon="🧭">{comunaSummary}</SummaryBadge>
        <SummaryBadge icon="👁️">Vista: {VIEW_LABEL[view]}</SummaryBadge>
        <SummaryBadge icon="👤">Sesión: {session?.username ?? 'sin sesión'}</SummaryBadge>
      </ul>

      <div className="mt-4 lg:hidden">
        <button
          type="button"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((current) => !current)}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          {panelOpen ? 'Ocultar controles' : 'Mostrar controles'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className={panelOpen ? 'block' : 'hidden lg:block'}>
          <ControlPanel
            view={view}
            onViewChange={setView}
            filters={filters}
            onFiltersChange={changeFilters}
            rankingSort={rankingSort}
            onRankingSortChange={setRankingSort}
            comunaOptions={comunaOptionsList}
            bounds={bounds}
            citizenCount={citizenCount}
            onExportCsv={() => downloadCsv(toCsv(reportRows), 'pulsovecinal-reportes.csv')}
            session={session}
            onLogout={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          />
        </div>

        <div className="min-w-0">
          {chips.length > 0 && (
            <ul aria-label="Filtros activos" className="mb-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={() => changeFilters(removeFilterChip(filters, chip.key))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                  >
                    {chip.label}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered.length === 0 ? (
            <EmptyState onClear={() => changeFilters(EMPTY_FILTERS)} />
          ) : (
            <>
              {view === 'resumen' && (
                <div className="space-y-8">
                  {kpiGrid}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900">Distribución por categoría</h2>
                      <p className="mt-1 text-sm text-slate-500">Reportes por categoría de problema.</p>
                      <div className="mt-4">
                        <CategoryChart data={categoryData} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900">Distribución por severidad</h2>
                      <p className="mt-1 text-sm text-slate-500">Urgencia de los reportes ciudadanos.</p>
                      <div className="mt-4">
                        <SeverityChart data={severityData} />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Tendencia de reportes</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Volumen diario y reportes críticos en el recorte actual.
                    </p>
                    <div className="mt-4">
                      <TrendChart data={trendData} />
                    </div>
                  </div>
                  {rankingBlock(sortedRanking.slice(0, 5))}
                </div>
              )}

              {view === 'reportes' && (
                <div className="space-y-6">
                  {kpiGrid}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Reportes específicos</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Cada fila es una respuesta ciudadana. Pulsa una para leer la descripción.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <ReportsTable
                      page={pagedReports}
                      sort={reportSort}
                      selectedId={selectedReportId}
                      onSortChange={(next) => {
                        setReportSort(next)
                        setPage(1)
                      }}
                      onSelect={setSelectedReportId}
                      onPageChange={setPage}
                    />
                    <ReportDetail row={selectedRow} onViewBarrio={drillIntoBarrio} />
                  </div>
                </div>
              )}

              {view === 'barrios' && rankingBlock()}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
