import { CATEGORY_LABELS } from '../../lib/types'
import type { ComplaintCategory, Severity, SurveyResponse } from '../../lib/types'
import { SEVERITY_LABELS } from './dashboardUtils'

/**
 * Active dashboard filters. Empty arrays mean "no filter for this group"
 * (AND semantics across groups, OR within a group). `includeCitizen` is a
 * data-source toggle, not a row filter — applyFilters ignores it.
 */
export interface DashboardFilters {
  readonly search: string
  readonly comunas: readonly string[]
  readonly categories: readonly ComplaintCategory[]
  readonly severities: readonly Severity[]
  /** Inclusive start date as YYYY-MM-DD, or null for no lower bound. */
  readonly from: string | null
  /** Inclusive end date as YYYY-MM-DD, or null for no upper bound. */
  readonly to: string | null
  readonly includeCitizen: boolean
}

export const EMPTY_FILTERS: DashboardFilters = {
  search: '',
  comunas: [],
  categories: [],
  severities: [],
  from: null,
  to: null,
  includeCitizen: false,
}

export type DatePreset = '7d' | '15d' | 'all'

/** Strips combining marks so "Cañaveral" matches "canaveral". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .trim()
}

function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Keeps only the responses matching every active filter group.
 * A group with an empty selection does not filter. Search matches barrio
 * or description after accent-insensitive normalization.
 */
export function applyFilters<T extends SurveyResponse>(
  responses: readonly T[],
  filters: DashboardFilters,
): T[] {
  const query = normalizeSearch(filters.search)
  return responses.filter((item) => {
    if (filters.comunas.length > 0 && !filters.comunas.includes(item.comuna)) {
      return false
    }
    if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
      return false
    }
    if (filters.severities.length > 0 && !filters.severities.includes(item.severity)) {
      return false
    }
    const day = dayOf(item.date)
    if (filters.from !== null && day < filters.from) {
      return false
    }
    if (filters.to !== null && day > filters.to) {
      return false
    }
    if (query.length > 0) {
      const haystack = normalizeSearch(`${item.barrio} ${item.description ?? ''}`)
      if (!haystack.includes(query)) {
        return false
      }
    }
    return true
  })
}

/**
 * How many filter groups are currently active (search, comuna, category,
 * severity, date range, citizen source). Used by the panel badge.
 */
export function activeFilterCount(filters: DashboardFilters): number {
  let count = 0
  if (normalizeSearch(filters.search).length > 0) {
    count += 1
  }
  if (filters.comunas.length > 0) {
    count += 1
  }
  if (filters.categories.length > 0) {
    count += 1
  }
  if (filters.severities.length > 0) {
    count += 1
  }
  if (filters.from !== null || filters.to !== null) {
    count += 1
  }
  if (filters.includeCitizen) {
    count += 1
  }
  return count
}

/** Min/max YYYY-MM-DD spanned by the responses; empty strings when none. */
export function dateBounds(responses: readonly SurveyResponse[]): { start: string; end: string } {
  if (responses.length === 0) {
    return { start: '', end: '' }
  }
  const days = responses.map((item) => dayOf(item.date))
  return {
    start: days.reduce((a, b) => (a < b ? a : b)),
    end: days.reduce((a, b) => (a > b ? a : b)),
  }
}

function toIsoDay(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Inclusive date range for a preset, computed from `endDate` (defaults to now).
 * `all` clears both bounds.
 */
export function presetRange(
  preset: DatePreset,
  endDate: Date = new Date(),
): { from: string | null; to: string | null } {
  if (preset === 'all') {
    return { from: null, to: null }
  }
  const to = toIsoDay(endDate)
  const days = preset === '7d' ? 6 : 14
  const fromDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))
  fromDate.setUTCDate(fromDate.getUTCDate() - days)
  return { from: toIsoDay(fromDate), to }
}

/** Display-ready chips of currently active filters, each with a removal key. */
export interface ActiveFilterChip {
  readonly key: string
  readonly label: string
}

/**
 * Builds removable chips for the active-filter strip above the views.
 * `includeCitizen` is rendered as a source chip; date bounds as a single chip.
 */
export function activeFilterChips(filters: DashboardFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []
  const query = filters.search.trim()
  if (query.length > 0) {
    chips.push({ key: 'search', label: `Búsqueda: ${query}` })
  }
  for (const comuna of filters.comunas) {
    chips.push({ key: `comuna:${comuna}`, label: comuna })
  }
  for (const category of filters.categories) {
    chips.push({ key: `category:${category}`, label: CATEGORY_LABELS[category] })
  }
  for (const severity of filters.severities) {
    chips.push({ key: `severity:${severity}`, label: SEVERITY_LABELS[severity] })
  }
  if (filters.from !== null || filters.to !== null) {
    const from = filters.from ?? '…'
    const to = filters.to ?? '…'
    chips.push({ key: 'period', label: `Periodo: ${from} → ${to}` })
  }
  if (filters.includeCitizen) {
    chips.push({ key: 'citizen', label: 'Incluye reportes ciudadanos' })
  }
  return chips
}

/** Removes one chip from the filters, identified by the chip key. */
export function removeFilterChip(filters: DashboardFilters, key: string): DashboardFilters {
  if (key === 'search') {
    return { ...filters, search: '' }
  }
  if (key === 'period') {
    return { ...filters, from: null, to: null }
  }
  if (key === 'citizen') {
    return { ...filters, includeCitizen: false }
  }
  if (key.startsWith('comuna:')) {
    const value = key.slice('comuna:'.length)
    return { ...filters, comunas: filters.comunas.filter((item) => item !== value) }
  }
  if (key.startsWith('category:')) {
    const value = key.slice('category:'.length) as ComplaintCategory
    return { ...filters, categories: filters.categories.filter((item) => item !== value) }
  }
  if (key.startsWith('severity:')) {
    const value = key.slice('severity:'.length) as Severity
    return { ...filters, severities: filters.severities.filter((item) => item !== value) }
  }
  return filters
}

/** Toggle helper for multi-select chip groups. */
export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}
