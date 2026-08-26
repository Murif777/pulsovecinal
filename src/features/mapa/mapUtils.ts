import type { ComplaintCategory, MapReport, Severity } from '../../lib/types'
import { ALL_CATEGORIES, CATEGORY_LABELS, SEVERITY_WEIGHTS } from '../../lib/types'

/**
 * Pure view-model helpers for the /mapa feature. No Leaflet imports here:
 * everything is unit-testable in jsdom and reusable by any renderer.
 */

/**
 * Emoji glyph for each complaint category, shared by the filter chips and the
 * popup breakdown rows. Decorative only: consumers must render it with
 * aria-hidden so accessible names stay clean.
 */
export const CATEGORY_ICONS: Readonly<Record<ComplaintCategory, string>> = {
  seguridad: '🔒',
  alcantarillado: '💧',
  energia: '⚡',
  vias: '🛣️',
  espacios_publicos: '🌳',
  otros: '📋',
}

/** Traffic-light hex color for each severity (Tailwind 500 tones). */
export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'baja':
      return '#22c55e'
    case 'media':
      return '#eab308'
    case 'alta':
      return '#f97316'
    case 'critica':
      return '#ef4444'
    default: {
      const unreachable: never = severity
      return unreachable
    }
  }
}

/**
 * Linear pixel radius for a report count, scaled between minR and maxR.
 * When every count in the dataset is equal (max === min) all markers get minR.
 */
export function radiusForCount(count: number, min: number, max: number, minR = 6, maxR = 22): number {
  if (max === min) {
    return minR
  }
  return minR + ((count - min) / (max - min)) * (maxR - minR)
}

/** One aggregated marker per barrio, ready to render on the map. */
export interface BarrioMarker {
  readonly barrio: string
  readonly comuna: string
  readonly lat: number
  readonly lng: number
  /** Total reports across all categories of the barrio. */
  readonly count: number
  /** Highest severity reported within the barrio. */
  readonly maxSeverity: Severity
  /** Report count per category; always contains all six keys. */
  readonly byCategory: Readonly<Record<ComplaintCategory, number>>
}

/** Active filter selections; an empty list means "no filter for this group". */
export interface MapFilters {
  readonly categories: readonly ComplaintCategory[]
  readonly severities: readonly Severity[]
  readonly comunas: readonly string[]
}

function emptyCategoryCounts(): Record<ComplaintCategory, number> {
  return { seguridad: 0, alcantarillado: 0, energia: 0, vias: 0, espacios_publicos: 0, otros: 0 }
}

function maxSeverityOf(a: Severity, b: Severity): Severity {
  return SEVERITY_WEIGHTS[a] >= SEVERITY_WEIGHTS[b] ? a : b
}

/**
 * Groups map reports into one BarrioMarker per barrio: sums counts, keeps the
 * maximum severity and the per-category breakdown. Sorted by barrio name.
 */
export function aggregateByBarrio(reports: readonly MapReport[]): BarrioMarker[] {
  const groups = new Map<
    string,
    {
      barrio: string
      comuna: string
      lat: number
      lng: number
      count: number
      maxSeverity: Severity
      byCategory: Record<ComplaintCategory, number>
    }
  >()

  for (const item of reports) {
    const existing = groups.get(item.barrio)
    if (existing) {
      existing.count += item.count
      existing.maxSeverity = maxSeverityOf(existing.maxSeverity, item.severity)
      existing.byCategory[item.category] += item.count
      continue
    }
    const byCategory = emptyCategoryCounts()
    byCategory[item.category] = item.count
    groups.set(item.barrio, {
      barrio: item.barrio,
      comuna: item.comuna,
      lat: item.lat,
      lng: item.lng,
      count: item.count,
      maxSeverity: item.severity,
      byCategory,
    })
  }

  return [...groups.values()]
    .map((entry) => ({
      barrio: entry.barrio,
      comuna: entry.comuna,
      lat: entry.lat,
      lng: entry.lng,
      count: entry.count,
      maxSeverity: entry.maxSeverity,
      byCategory: { ...entry.byCategory },
    }))
    .sort((a, b) => a.barrio.localeCompare(b.barrio))
}

/**
 * Keeps only the reports matching every active filter group (AND semantics).
 * A group with an empty selection does not filter. Exact match per value.
 */
export function filterReports(reports: readonly MapReport[], filters: MapFilters): MapReport[] {
  return reports.filter(
    (item) =>
      (filters.categories.length === 0 || filters.categories.includes(item.category)) &&
      (filters.severities.length === 0 || filters.severities.includes(item.severity)) &&
      (filters.comunas.length === 0 || filters.comunas.includes(item.comuna)),
  )
}

/** One display-ready row of a popup category breakdown. */
export interface CategoryBreakdownEntry {
  readonly category: ComplaintCategory
  readonly label: string
  readonly count: number
}

/**
 * Popup breakdown of a marker: categories with count > 0, Spanish labels,
 * sorted by descending count (ties break by canonical category order).
 */
export function breakdownByCategory(marker: BarrioMarker): CategoryBreakdownEntry[] {
  return ALL_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    count: marker.byCategory[category],
  }))
    .filter((entry) => entry.count > 0)
    .sort(
      (a, b) => b.count - a.count || ALL_CATEGORIES.indexOf(a.category) - ALL_CATEGORIES.indexOf(b.category),
    )
}
