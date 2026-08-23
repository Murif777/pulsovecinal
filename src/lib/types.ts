/**
 * Central data contracts for PulsoVecinal.
 *
 * Without a backend yet, every feature develops against these types plus
 * `mockData.ts`. Shared code is append-only per the TBD rule in PLAN.md §2:
 * add new types here, never mutate existing ones.
 */

/** Kind of urban problem reported by citizens in the survey. */
export type ComplaintCategory =
  | 'seguridad'
  | 'alcantarillado'
  | 'energia'
  | 'vias'
  | 'espacios_publicos'
  | 'otros'

/** All categories, in canonical order (form dropdowns, tallies, tests). */
export const ALL_CATEGORIES = [
  'seguridad',
  'alcantarillado',
  'energia',
  'vias',
  'espacios_publicos',
  'otros',
] as const satisfies readonly ComplaintCategory[]

/** Spanish display label for each category (UI never renders raw union values). */
export const CATEGORY_LABELS: Readonly<Record<ComplaintCategory, string>> = {
  seguridad: 'Seguridad',
  alcantarillado: 'Alcantarillado',
  energia: 'Energía eléctrica',
  vias: 'Vías y transporte',
  espacios_publicos: 'Espacios públicos',
  otros: 'Otros',
}

/** Urgency level that the citizen assigns to a complaint. */
export type Severity = 'baja' | 'media' | 'alta'

/** All severity levels, from least to most urgent. */
export const ALL_SEVERITIES = ['baja', 'media', 'alta'] as const satisfies readonly Severity[]

/**
 * Weight of each severity when computing barrio criticality scores.
 * A "media" complaint counts twice as much as a "baja" one, and so on.
 */
export const SEVERITY_WEIGHTS: Readonly<Record<Severity, number>> = {
  baja: 1,
  media: 2,
  alta: 3,
}

/** One citizen survey answer, as collected by an encuestador. */
export interface SurveyResponse {
  readonly id: string
  /** Real Valledupar neighborhood name (e.g. "La Esperanza"). */
  readonly barrio: string
  /** Comuna the barrio belongs to (e.g. "Comuna 2"). */
  readonly comuna: string
  readonly category: ComplaintCategory
  readonly severity: Severity
  /** Free-text detail written by the citizen. */
  readonly description?: string
  /** ISO 8601 timestamp of when the response was collected. */
  readonly date: string
  /** Volunteer who collected the response. */
  readonly encuestador?: string
}

/**
 * Aggregated view model consumed by the future Leaflet map: one report per
 * (barrio, category) pair with its geographic position and complaint count.
 */
export interface MapReport {
  readonly id: string
  readonly barrio: string
  readonly comuna: string
  readonly lat: number
  readonly lng: number
  readonly category: ComplaintCategory
  /** Highest severity reported within this aggregation group. */
  readonly severity: Severity
  readonly complaintCount: number
}

/** A barrio ranked by weighted complaint score, led by its most frequent category. */
export interface CriticalBarrio {
  readonly barrio: string
  readonly comuna: string
  /** Sum of SEVERITY_WEIGHTS across all responses of the barrio. */
  readonly score: number
  readonly topCategory: ComplaintCategory
}

/** Reporting period covered by a dashboard summary (ISO 8601 dates). */
export interface SummaryPeriod {
  readonly start: string
  readonly end: string
}

/** Aggregate view model consumed by the future criticality dashboard. */
export interface DashboardSummary {
  readonly totalResponses: number
  /** Response count per category; always contains all six keys. */
  readonly byCategory: Readonly<Record<ComplaintCategory, number>>
  /** Barrios sorted by descending criticality score. */
  readonly criticalBarrios: readonly CriticalBarrio[]
  /** Period spanned by the underlying responses. */
  readonly period: SummaryPeriod
}
