import { useMemo, useState } from 'react'
import { getMapReports } from '../../lib/mockData'
import type { ComplaintCategory, Severity } from '../../lib/types'
import FilterBar from './FilterBar'
import Legend from './Legend'
import MapaView from './MapaView'
import { aggregateByBarrio, filterReports } from './mapUtils'

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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Mapa interactivo
      </h1>
      <p className="mt-2 leading-7 text-slate-600">Criticidad por barrio — Valledupar</p>
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
