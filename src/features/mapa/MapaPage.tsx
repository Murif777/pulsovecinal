import { useEffect, useMemo, useState } from 'react'
import { getMapPoints, getMapReports } from '../../lib/api'
import type { ComplaintCategory, MapPoint, MapReport, Severity } from '../../lib/types'
import FilterBar from './FilterBar'
import Legend from './Legend'
import MapaView from './MapaView'
import { aggregateByBarrio, breakdownByCategory, filterReports, severityColor } from './mapUtils'
import { SEVERITY_WEIGHTS } from '../../lib/types'

/**
 * /mapa page: interactive criticality map of Valledupar barrios.
 * Consumes the aggregated reports of GET /api/mapa/reportes (the backend
 * already merges citizen submissions) and derives the rendered markers
 * through the pure helpers: reports -> filterReports -> aggregateByBarrio.
 */
export default function MapaPage() {
  const [selectedCategories, setSelectedCategories] = useState<readonly ComplaintCategory[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<readonly Severity[]>([])
  const [selectedComunas, setSelectedComunas] = useState<readonly string[]>([])

  const [layer, setLayer] = useState<'barrios' | 'puntos'>('barrios')
  const [points, setPoints] = useState<MapPoint[]>([])
  const [pointsError, setPointsError] = useState(false)
  const [selectedBarrio, setSelectedBarrio] = useState<string | null>(null)
  const [reports, setReports] = useState<MapReport[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    getMapReports()
      .then((items) => {
        if (cancelled) {
          return
        }
        setReports(items)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  useEffect(() => {
    let cancelled = false
    getMapPoints()
      .then((items) => {
        if (!cancelled) {
          setPoints(items)
          setPointsError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPointsError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (point) =>
          (selectedCategories.length === 0 || selectedCategories.includes(point.category)) &&
          (selectedSeverities.length === 0 || selectedSeverities.includes(point.severity)) &&
          (selectedComunas.length === 0 || selectedComunas.includes(point.comuna)),
      ),
    [points, selectedCategories, selectedSeverities, selectedComunas],
  )

  const comunaOptions = useMemo(
    () => [...new Set(reports.map((report) => report.comuna))].sort((a, b) => a.localeCompare(b)),
    [reports],
  )

  const markers = useMemo(
    () =>
      aggregateByBarrio(
        filterReports(reports, {
          categories: selectedCategories,
          severities: selectedSeverities,
          comunas: selectedComunas,
        }),
      ),
    [reports, selectedCategories, selectedSeverities, selectedComunas],
  )

  const totalReports = useMemo(() => markers.reduce((sum, marker) => sum + marker.count, 0), [markers])

  const ranking = useMemo(
    () =>
      [...markers]
        .sort(
          (a, b) =>
            SEVERITY_WEIGHTS[b.maxSeverity] - SEVERITY_WEIGHTS[a.maxSeverity] || b.count - a.count,
        )
        .slice(0, 8),
    [markers],
  )

  const criticalCount = useMemo(
    () => markers.filter((marker) => marker.maxSeverity === 'critica').length,
    [markers],
  )

  const toggleCategory = (category: ComplaintCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    )
  }

  const toggleSeverity = (severity: Severity) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((item) => item !== severity) : [...prev, severity],
    )
  }

  const toggleComuna = (comuna: string) => {
    setSelectedComunas((prev) =>
      prev.includes(comuna) ? prev.filter((item) => item !== comuna) : [...prev, comuna],
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedSeverities([])
    setSelectedComunas([])
  }

  const comunaSummary =
    selectedComunas.length === 0
      ? 'Comuna activa: todas'
      : `Comunas activas: ${selectedComunas.join(', ')}`

  return (
    <section className="grid lg:h-[calc(100dvh-4.25rem)] lg:grid-cols-[26rem_1fr]">
      {/* ── Panel lateral ── */}
      <div className="order-2 overflow-y-auto border-slate-200 bg-paper px-5 pb-10 pt-8 sm:px-8 lg:order-1 lg:border-r">
        <h1 className="text-4xl font-bold leading-[1.05] text-slate-900">Reportes en vivo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Criticidad por barrio — la voz de la comunidad sobre el mapa
        </p>

        <dl aria-label="Resumen del mapa" className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          <div className="bg-white px-3 py-4">
            <dd className="font-display text-3xl font-bold tabular-nums text-slate-900">
              {markers.length}
            </dd>
            <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {markers.length === 1 ? 'barrio' : 'barrios'}
            </dt>
          </div>
          <div className="bg-white px-3 py-4">
            <dd className="font-display text-3xl font-bold tabular-nums text-slate-900">
              {totalReports}
            </dd>
            <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {totalReports === 1 ? 'reporte' : 'reportes'}
            </dt>
          </div>
          <div className="bg-white px-3 py-4">
            <dd className="font-display text-3xl font-bold tabular-nums text-pulse-600">
              {criticalCount}
            </dd>
            <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              críticos
            </dt>
          </div>
        </dl>
        <p className="mt-3 text-xs font-semibold text-slate-500">{comunaSummary}</p>

        <div role="group" aria-label="Capa del mapa" className="mt-6 flex rounded-full bg-slate-200/70 p-1">
          {(
            [
              ['barrios', 'Por barrio'],
              ['puntos', 'Puntos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={layer === id}
              onClick={() => setLayer(id)}
              className={`min-h-[2.5rem] flex-1 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${layer === id ? 'bg-slate-900 text-paper' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {layer === 'puntos' && (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {pointsError
              ? 'No se pudieron cargar los puntos.'
              : visiblePoints.length === 0
                ? 'Aún no hay reportes con ubicación para estos filtros.'
                : `${visiblePoints.length} ${visiblePoints.length === 1 ? 'reporte con ubicación' : 'reportes con ubicación'}. Posición aproximada, sin datos personales.`}
          </p>
        )}

        <div className="mt-8">
          <FilterBar
            selectedCategories={selectedCategories}
            selectedSeverities={selectedSeverities}
            selectedComunas={selectedComunas}
            comunaOptions={comunaOptions}
            onToggleCategory={toggleCategory}
            onToggleSeverity={toggleSeverity}
            onToggleComuna={toggleComuna}
            onClearFilters={clearFilters}
          />
        </div>

        {ranking.length > 0 && (
          <div className="mt-9">
            <h2 className="font-display text-lg font-bold text-slate-900">Más urgentes</h2>
            <ol className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {ranking.map((marker, index) => {
                const top = breakdownByCategory(marker)[0]
                const active = marker.barrio === selectedBarrio
                return (
                  <li key={marker.barrio}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedBarrio(marker.barrio)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-2 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 ${active ? 'bg-brand-50' : 'hover:bg-slate-100'}`}
                    >
                      <span className="w-5 font-display text-lg font-bold tabular-nums text-slate-400">
                        {index + 1}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: severityColor(marker.maxSeverity) }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {marker.barrio}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {marker.comuna}
                          {top !== undefined ? ` · ${top.label}` : ''}
                        </span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-slate-600">
                        {marker.count} rep.
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      {/* ── Mapa ── */}
      <div className="relative order-1 h-[60vh] min-h-[22rem] bg-slate-100 lg:order-2 lg:h-auto">
        {status === 'loading' ? (
          <div className="flex h-full items-center justify-center">
            <p role="status" className="text-sm font-semibold text-slate-600">
              Cargando mapa…
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-pulse-500/5 px-6 text-center">
            <p role="alert" className="text-sm font-semibold text-pulse-600">
              No se pudieron cargar los reportes del mapa.
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-paper transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Reintentar mapa
            </button>
          </div>
        ) : (
          <>
            <MapaView
              markers={markers}
              selectedBarrio={selectedBarrio}
              onSelectBarrio={setSelectedBarrio}
              layer={layer}
              points={visiblePoints}
            />
            <Legend />
            {layer === 'barrios' && markers.length === 0 && (
              <div
                role="status"
                className="absolute inset-0 z-[1100] flex items-center justify-center bg-paper/60 p-6 backdrop-blur-[2px]"
              >
                <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lift">
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    No hay barrios con esos filtros
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Prueba con otra combinación de categorías, severidades o comunas.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
