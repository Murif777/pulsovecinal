import { useMemo, useState } from 'react'
import { getMapReports } from '../../lib/mockData'
import type { ComplaintCategory, Severity } from '../../lib/types'
import FilterBar from './FilterBar'
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

  const reports = useMemo(() => getMapReports(), [])

  const markers = useMemo(
    () =>
      aggregateByBarrio(
        filterReports(reports, {
          categories: selectedCategories,
          severities: selectedSeverities,
          comunas: [],
        }),
      ),
    [reports, selectedCategories, selectedSeverities],
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

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedSeverities([])
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
          onToggleCategory={toggleCategory}
          onToggleSeverity={toggleSeverity}
          onClearFilters={clearFilters}
        />
      </div>
      <div className="mt-4">
        <MapaView markers={markers} />
      </div>
    </section>
  )
}
