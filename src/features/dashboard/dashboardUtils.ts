import type {
  ComplaintCategory,
  CriticalBarrio,
  DashboardSummary,
  MapReport,
  Severity,
  SurveyResponse,
} from '../../lib/types'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS, SEVERITY_WEIGHTS } from '../../lib/types'

/**
 * Pure view-model helpers for the /dashboard feature. No recharts or DOM
 * imports here: everything is unit-testable in jsdom and reusable by any
 * renderer. All helpers derive from the canonical aggregators in mockData.ts
 * (getDashboardSummary / getMapReports) — they never touch the raw dataset.
 */

/** Spanish display label for each severity (local copy — features stay decoupled). */
export const SEVERITY_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

/** Traffic-light hex color for each severity (same palette as the map). */
export const SEVERITY_COLORS: Readonly<Record<Severity, string>> = {
  baja: '#22c55e',
  media: '#eab308',
  alta: '#f97316',
  critica: '#ef4444',
}

/** The four headline numbers shown as KPI cards. */
export interface DashboardKpis {
  readonly totalResponses: number
  /** Distinct barrios present in the summary. */
  readonly barriosCubiertos: number
  readonly topCategory: ComplaintCategory
  readonly topCategoryCount: number
  /** Responses with severity === 'critica'. */
  readonly criticalCount: number
}

/** Derives the four KPI values from a dashboard summary. */
export function computeKpis(summary: DashboardSummary): DashboardKpis {
  const topCategory = ALL_CATEGORIES.reduce((best, category) =>
    summary.byCategory[category] > summary.byCategory[best] ? category : best,
  )
  return {
    totalResponses: summary.totalResponses,
    barriosCubiertos: summary.criticalBarrios.length,
    topCategory,
    topCategoryCount: summary.byCategory[topCategory],
    criticalCount: summary.bySeverity.critica,
  }
}

/** One display-ready row of the barrio ranking table. */
export interface RankingRow {
  readonly barrio: string
  readonly comuna: string
  readonly score: number
  /** Total reports of the barrio across all categories (from getMapReports). */
  readonly totalCount: number
  readonly topCategory: ComplaintCategory
  /** Highest severity reported within the barrio. */
  readonly maxSeverity: Severity
}

function maxSeverityOf(a: Severity, b: Severity): Severity {
  return SEVERITY_WEIGHTS[a] >= SEVERITY_WEIGHTS[b] ? a : b
}

/**
 * Enriches the summary's critical barrios with the total report count and the
 * maximum severity per barrio (both derived from the map reports), preserving
 * the descending score order.
 */
export function buildRanking(summary: DashboardSummary, reports: readonly MapReport[]): RankingRow[] {
  const countByBarrio = new Map<string, number>()
  const severityByBarrio = new Map<string, Severity>()
  for (const report of reports) {
    countByBarrio.set(report.barrio, (countByBarrio.get(report.barrio) ?? 0) + report.count)
    const current = severityByBarrio.get(report.barrio)
    severityByBarrio.set(
      report.barrio,
      current === undefined ? report.severity : maxSeverityOf(current, report.severity),
    )
  }
  return summary.criticalBarrios.map((entry: CriticalBarrio) => ({
    barrio: entry.barrio,
    comuna: entry.comuna,
    score: entry.score,
    totalCount: countByBarrio.get(entry.barrio) ?? 0,
    topCategory: entry.topCategory,
    maxSeverity: severityByBarrio.get(entry.barrio) ?? 'baja',
  }))
}

/** One display-ready bar of the category distribution chart. */
export interface CategoryDistributionEntry {
  readonly category: ComplaintCategory
  readonly label: string
  readonly count: number
}

/** Maps the six categories to { category, label, count } in canonical order. */
export function categoryDistribution(summary: DashboardSummary): CategoryDistributionEntry[] {
  return ALL_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    count: summary.byCategory[category],
  }))
}

/** One display-ready segment of the severity donut. */
export interface SeverityDistributionEntry {
  readonly severity: Severity
  readonly label: string
  readonly count: number
  readonly color: string
}

/** Maps the four severities to { severity, label, count, color } in canonical order. */
export function severityDistribution(summary: DashboardSummary): SeverityDistributionEntry[] {
  return ALL_SEVERITIES.map((severity) => ({
    severity,
    label: SEVERITY_LABELS[severity],
    count: summary.bySeverity[severity],
    color: SEVERITY_COLORS[severity],
  }))
}

/**
 * Keeps only the responses of one comuna; null means "all comunas".
 * Returns a new array so callers can safely re-derive summaries from it.
 */
export function filterResponsesByComuna(
  responses: readonly SurveyResponse[],
  comuna: string | null,
): SurveyResponse[] {
  if (comuna === null) {
    return [...responses]
  }
  return responses.filter((item) => item.comuna === comuna)
}

/** Distinct comunas present in the responses, sorted by name. */
export function comunaOptions(responses: readonly SurveyResponse[]): string[] {
  return [...new Set(responses.map((item) => item.comuna))].sort((a, b) => a.localeCompare(b))
}