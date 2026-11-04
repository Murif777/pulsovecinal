import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getDashboardSummary as fetchApiSummary, getSurveys } from '../../lib/api'
import { getDashboardSummary as deriveSummary, getMapReports as aggregateMapReports } from '../../lib/mockData'
import { CATEGORY_LABELS } from '../../lib/types'
import type { DashboardSummary, SurveyResponse } from '../../lib/types'
import { getSession, logout } from './auth'
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
  activeFilterCount,
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
import { Icon } from '../../components/Icon'

type SummaryBadgeProps = {
  icon: ReactNode
  children: ReactNode
}

/** Meta item of the dashboard band (period, comuna, view, session). */
function SummaryBadge({ icon, children }: SummaryBadgeProps) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1">
      {icon}
      <span className="text-brand-100/80">{children}</span>
    </li>
  )
}

type ChartCardProps = {
  title: string
  description: string
  className?: string
  children: ReactNode
}

/** White card of the bento grid: serif title and a chart. */
function ChartCard({ title, description, className = '', children }: ChartCardProps) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-card ${className}`}>
      <h2 className="font-display text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
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
 * Consumes GET /api/encuestas + GET /api/dashboard/resumen (the backend
 * already merges citizen submissions) and derives every view model through
 * the pure helpers, then hands presentational components the result.
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

  const [surveys, setSurveys] = useState<readonly SurveyResponse[]>([])
  const [apiSummary, setApiSummary] = useState<DashboardSummary | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    Promise.all([getSurveys(), fetchApiSummary()])
      .then(([responses, summary]) => {
        if (cancelled) {
          return
        }
        setSurveys(responses)
        setApiSummary(summary)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        // apiGet already cleared the persisted session on 401 — this only
        // bounces the analyst back to the login form.
        if (error instanceof ApiError && error.status === 401) {
          logout()
          navigate('/login', { replace: true })
          return
        }
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [retryKey, navigate])

  const bounds = useMemo(() => dateBounds(surveys), [surveys])
  const comunaOptionsList = useMemo(() => comunaOptions(surveys), [surveys])
  const hasRowFilters = activeFilterCount(filters) > 0
  const filtered = useMemo(() => applyFilters(surveys, filters), [surveys, filters])
  const summary = useMemo(() => {
    // The API summary is authoritative while no row filter is active; under a
    // filter the page re-derives the summary from the filtered responses.
    if (!hasRowFilters && apiSummary !== null) {
      return apiSummary
    }
    return deriveSummary(filtered)
  }, [apiSummary, hasRowFilters, filtered])
  const kpis = useMemo(() => computeKpis(summary), [summary])
  const mapReports = useMemo(() => aggregateMapReports(filtered), [filtered])
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
  const sourceTotal = surveys.length
  const filteredAway = sourceTotal !== kpis.totalResponses
  const hint = filteredAway ? `de ${sourceTotal} en la fuente activa` : undefined

  const changeFilters = (next: DashboardFilters) => {
    setFilters(next)
    setPage(1)
    setSelectedReportId(null)
  }

  const drillIntoBarrio = (barrio: string) => {
    changeFilters({ ...EMPTY_FILTERS, search: barrio })
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard icon={<Icon name="chart" />} label="Reportes totales" value={String(kpis.totalResponses)} hint={hint} />
      <KpiCard icon={<Icon name="pin" />} label="Barrios cubiertos" value={String(kpis.barriosCubiertos)} hint={hint} />
      <KpiCard
        icon={<Icon name="tag" />}
        label="Categoría más reportada"
        value={`${CATEGORY_LABELS[kpis.topCategory]} (${kpis.topCategoryCount})`}
      />
      <KpiCard icon={<Icon name="alert" />} label="Reportes críticos" value={String(kpis.criticalCount)} tone="red" />
    </div>
  )

  const rankingBlock = (rows = sortedRanking) => (
    <div>
      <h2 className="font-display text-2xl font-bold text-slate-900">Barrios más críticos</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ranking por score ponderado según la severidad de los reportes. Pulsa un barrio para ver sus reportes.
      </p>
      <div className="mt-4">
        <RankingTable
          rows={rows}
          sort={rankingSort}
          onSortChange={setRankingSort}
          onSelectBarrio={drillIntoBarrio}
        />
      </div>
    </div>
  )

  const ready = loadState === 'ready'

  return (
    <>
      {/* ── Banda de cabecera: título + indicadores clave ── */}
      <header className="relative overflow-hidden bg-brand-950 text-paper">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-pulse-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6">
          <h1 className=" text-4xl font-bold leading-[1.05] text-paper sm:text-5xl">
            Dashboard de criticidad
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-brand-100/75">
            Priorización de necesidades barriales — Valledupar
          </p>

          {ready && (
            <>
              <ul aria-label="Resumen del dashboard" className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <SummaryBadge icon={<Icon name="calendar" className="h-3.5 w-3.5" />}>
                  Periodo: {summary.period.start.slice(0, 10) || '—'} → {summary.period.end.slice(0, 10) || '—'}
                </SummaryBadge>
                <SummaryBadge icon={<Icon name="map" className="h-3.5 w-3.5" />}>{comunaSummary}</SummaryBadge>
                <SummaryBadge icon={<Icon name="layers" className="h-3.5 w-3.5" />}>Vista: {VIEW_LABEL[view]}</SummaryBadge>
                <SummaryBadge icon={<Icon name="user" className="h-3.5 w-3.5" />}>Sesión: {session?.usuario.usuario ?? 'sin sesión'}</SummaryBadge>
              </ul>
              <div className="mt-8">{kpiGrid}</div>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        {loadState === 'loading' ? (
          <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <p role="status" className="text-sm font-semibold text-slate-600">
              Cargando dashboard…
            </p>
          </div>
        ) : loadState === 'error' ? (
          <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-3xl border border-pulse-500/30 bg-pulse-500/5 px-6 text-center">
            <p role="alert" className="text-sm font-semibold text-pulse-600">
              No se pudieron cargar los datos del dashboard.
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-paper transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Reintentar dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              <button
                type="button"
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen((current) => !current)}
                className="inline-flex min-h-[2.75rem] items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {panelOpen ? 'Ocultar controles' : 'Mostrar controles'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-0 lg:grid-cols-[300px_minmax(0,1fr)]">
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
                  onExportCsv={() => downloadCsv(toCsv(reportRows), 'pulsovecinal-reportes.csv')}
                  session={
                    session === null
                      ? null
                      : { username: session.usuario.usuario, loggedInAt: session.loggedInAt }
                  }
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
                          className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-xs font-bold text-paper hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
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
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                          <ChartCard
                                                        title="Distribución por categoría"
                            description="Reportes por categoría de problema."
                            className="xl:col-span-3"
                          >
                            <CategoryChart data={categoryData} />
                          </ChartCard>
                          <ChartCard
                                                        title="Distribución por severidad"
                            description="Urgencia de los reportes ciudadanos."
                            className="xl:col-span-2"
                          >
                            <SeverityChart data={severityData} />
                          </ChartCard>
                        </div>
                        <ChartCard
                                                    title="Tendencia de reportes"
                          description="Volumen diario y reportes críticos en el recorte actual."
                        >
                          <TrendChart data={trendData} />
                        </ChartCard>
                        {rankingBlock(sortedRanking.slice(0, 5))}
                      </div>
                    )}

                    {view === 'reportes' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-display text-2xl font-bold text-slate-900">
                            Reportes específicos
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Cada fila es una respuesta ciudadana. Pulsa una para leer la descripción.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
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
          </>
        )}
      </section>
    </>
  )
}
