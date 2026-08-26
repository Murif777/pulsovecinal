import { getMapReports } from '../../lib/mockData'
import type { ComplaintCategory, Severity, SurveyResponse } from '../../lib/types'
import { ALL_CATEGORIES, ALL_SEVERITIES } from '../../lib/types'

/**
 * Read-only access to citizen survey responses stored by /encuesta.
 * Lives inside the dashboard feature so it never imports from encuesta/
 * (TBD rule: features stay decoupled). The storage key matches the
 * encuesta convention by design.
 */
export const CITIZEN_STORAGE_KEY = 'pulsovecinal.surveyResponses'

/** Origin of a dashboard row: the shared mock dataset or a citizen form submit. */
export type ReportSource = 'mock' | 'ciudadano'

/** A survey response tagged with where it came from. */
export interface SourcedSurveyResponse extends SurveyResponse {
  readonly source: ReportSource
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isComplaintCategory(value: unknown): value is ComplaintCategory {
  return typeof value === 'string' && (ALL_CATEGORIES as readonly string[]).includes(value)
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && (ALL_SEVERITIES as readonly string[]).includes(value)
}

/**
 * Barrios that getMapReports() can geocode. Anything outside this set would
 * throw when building the ranking, so citizen payloads with unknown barrios
 * are dropped on load.
 */
export function knownBarrios(): ReadonlySet<string> {
  return new Set(getMapReports().map((report) => report.barrio))
}

/** Type guard used when reading potentially corrupted localStorage payloads. */
export function isSurveyResponse(value: unknown, barrios: ReadonlySet<string>): value is SurveyResponse {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    return false
  }
  if (typeof value.barrio !== 'string' || !barrios.has(value.barrio)) {
    return false
  }
  if (typeof value.comuna !== 'string' || value.comuna.length === 0) {
    return false
  }
  if (!isComplaintCategory(value.category)) {
    return false
  }
  if (!isSeverity(value.severity)) {
    return false
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return false
  }
  if (typeof value.date !== 'string' || value.date.length === 0) {
    return false
  }
  if (value.encuestador !== undefined && typeof value.encuestador !== 'string') {
    return false
  }
  return true
}

function getLocalStorage(): Storage {
  return window.localStorage
}

/**
 * Reads citizen survey responses from localStorage. Corrupted payloads,
 * non-arrays and barrios without registered coordinates are dropped.
 */
export function loadCitizenResponses(): SourcedSurveyResponse[] {
  const barrios = knownBarrios()
  try {
    const raw = getLocalStorage().getItem(CITIZEN_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is SurveyResponse => isSurveyResponse(item, barrios))
      .map((item) => ({ ...item, source: 'ciudadano' as const }))
  } catch {
    return []
  }
}

/** Tags the mock dataset so every dashboard row carries a source. */
export function tagMockResponses(responses: readonly SurveyResponse[]): SourcedSurveyResponse[] {
  return responses.map((item) => ({ ...item, source: 'mock' as const }))
}

/**
 * Combines the mock dataset with (optional) citizen responses.
 * Citizen rows are appended after the mock so the canonical 20 stay first.
 */
export function mergeResponses(
  mock: readonly SurveyResponse[],
  includeCitizen: boolean,
): SourcedSurveyResponse[] {
  const tagged = tagMockResponses(mock)
  if (!includeCitizen) {
    return tagged
  }
  return [...tagged, ...loadCitizenResponses()]
}
