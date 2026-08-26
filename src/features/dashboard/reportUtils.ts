import { CATEGORY_LABELS, SEVERITY_WEIGHTS } from '../../lib/types'
import type { ComplaintCategory, Severity } from '../../lib/types'
import type { ReportSource, SourcedSurveyResponse } from './citizenReports'
import { SEVERITY_LABELS } from './dashboardUtils'

/** Display-ready row of the specific-reports table. */
export interface ReportRow {
  readonly id: string
  readonly barrio: string
  readonly comuna: string
  readonly category: ComplaintCategory
  readonly severity: Severity
  readonly description: string
  readonly date: string
  readonly encuestador?: string
  readonly source: ReportSource
}

export type ReportSortKey = 'date' | 'barrio' | 'severity' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface ReportSort {
  readonly key: ReportSortKey
  readonly direction: SortDirection
}

export const DEFAULT_REPORT_SORT: ReportSort = { key: 'date', direction: 'desc' }

export const PAGE_SIZE = 8

/** Maps sourced responses to table rows (empty description becomes ''). */
export function toReportRows(responses: readonly SourcedSurveyResponse[]): ReportRow[] {
  return responses.map((item) => ({
    id: item.id,
    barrio: item.barrio,
    comuna: item.comuna,
    category: item.category,
    severity: item.severity,
    description: item.description ?? '',
    date: item.date,
    encuestador: item.encuestador,
    source: item.source,
  }))
}

function compareRows(a: ReportRow, b: ReportRow, key: ReportSortKey): number {
  switch (key) {
    case 'date':
      return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
    case 'barrio':
      return a.barrio.localeCompare(b.barrio, 'es') || a.date.localeCompare(b.date)
    case 'severity':
      return SEVERITY_WEIGHTS[a.severity] - SEVERITY_WEIGHTS[b.severity] || a.date.localeCompare(b.date)
    case 'category':
      return a.category.localeCompare(b.category) || a.date.localeCompare(b.date)
    default: {
      const unreachable: never = key
      return unreachable
    }
  }
}

/** Stable sort of report rows by the requested column. */
export function sortReportRows(
  rows: readonly ReportRow[],
  key: ReportSortKey,
  direction: SortDirection,
): ReportRow[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => sign * compareRows(a, b, key))
}

export interface PageResult<T> {
  readonly items: readonly T[]
  readonly page: number
  readonly totalPages: number
  readonly total: number
}

/**
 * Returns a 1-indexed page of `size` items. Out-of-range pages clamp to the
 * last available page (or page 1 when the list is empty).
 */
export function paginate<T>(rows: readonly T[], page: number, size: number): PageResult<T> {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / size) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * size
  return {
    items: rows.slice(start, start + size),
    page: safePage,
    totalPages,
    total,
  }
}

function csvCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const CSV_HEADERS = [
  'id',
  'barrio',
  'comuna',
  'categoría',
  'severidad',
  'descripción',
  'fecha',
  'encuestador',
  'origen',
] as const

/**
 * Serializes report rows to a CSV string with `;` delimiter and a UTF-8 BOM
 * so Spanish accents open correctly in Excel.
 */
export function toCsv(rows: readonly ReportRow[]): string {
  const lines = [
    CSV_HEADERS.join(';'),
    ...rows.map((row) =>
      [
        row.id,
        row.barrio,
        row.comuna,
        CATEGORY_LABELS[row.category],
        SEVERITY_LABELS[row.severity],
        row.description,
        row.date,
        row.encuestador ?? '',
        row.source === 'ciudadano' ? 'ciudadano' : 'mock',
      ]
        .map(csvCell)
        .join(';'),
    ),
  ]
  return `\ufeff${lines.join('\n')}`
}

export type RankingSortKey = 'score' | 'totalCount' | 'barrio'

export interface RankingSort {
  readonly key: RankingSortKey
  readonly direction: SortDirection
}

export const DEFAULT_RANKING_SORT: RankingSort = { key: 'score', direction: 'desc' }

export interface Rankable {
  readonly barrio: string
  readonly score: number
  readonly totalCount: number
}

/** Sorts ranking rows without mutating the original array. */
export function sortRankingRows<T extends Rankable>(
  rows: readonly T[],
  key: RankingSortKey,
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (key === 'barrio') {
      cmp = a.barrio.localeCompare(b.barrio, 'es')
    } else {
      cmp = a[key] - b[key]
    }
    return sign * cmp || a.barrio.localeCompare(b.barrio, 'es')
  })
}
