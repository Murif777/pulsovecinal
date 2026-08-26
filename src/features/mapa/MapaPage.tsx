import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getMapReports } from '../../lib/mockData'
import type { ComplaintCategory, Severity } from '../../lib/types'
import FilterBar from './FilterBar'
import Legend from './Legend'
import MapaView from './MapaView'
import { aggregateByBarrio, filterReports } from './mapUtils'

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

/**
 * /mapa page: interactive criticality map of Valledupar barrios.
 * Owns the filter state and derives the rendered markers through the pure
 * helpers: getMapReports -> filterReports -> aggregateByBarrio -> MapaView.
 */
export default function MapaPage() {
  const [selectedCategories, setSelectedCategories] = useState<readonly ComplaintCategory[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<readonly Severity[]>([])
  const [selectedComunas, setSelectedComunas] = useState<readonly string[]>([])

  const reports = useMemo(() => getMapReports(), [])

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
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
        <PulseMark />
        PulsoVecinal · Valledupar
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Mapa interactivo
      </h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-500">
        Criticidad por barrio — la voz de la comunidad sobre el mapa
      </p>

      <ul aria-label="Resumen del mapa" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <SummaryBadge icon="📍">
          <strong className="font-semibold tabular-nums text-slate-900">{markers.length}</strong>{' '}
          {markers.length === 1 ? 'barrio' : 'barrios'}
        </SummaryBadge>
        <SummaryBadge icon="🩺">
          <strong className="font-semibold tabular-nums text-slate-900">{totalReports}</strong>{' '}
          {totalReports === 1 ? 'reporte' : 'reportes'}
        </SummaryBadge>
        <SummaryBadge icon="🧭">{comunaSummary}</SummaryBadge>
      </ul>

      <div className="mt-6">
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
      <div className="relative mt-4">
        <MapaView markers={markers} />
        <Legend />
      </div>
    </section>
  )
}
