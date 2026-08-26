import type { ComplaintCategory, Severity, SurveyResponse } from './types'
import { ALL_CATEGORIES, ALL_SEVERITIES } from './types'
import { getComuna } from '../features/encuesta/barrios'

/**
 * Canonical localStorage persistence for citizen survey responses.
 * Single source of truth shared by /encuesta (writes), /mapa and /dashboard
 * (reads). The barrio registry lives in the encuesta feature (read-only);
 * importing it here keeps the comuna derivation consistent with the form.
 */
export const SURVEY_STORAGE_KEY = 'pulsovecinal.surveyResponses'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isComplaintCategory(value: unknown): value is ComplaintCategory {
  return typeof value === 'string' && (ALL_CATEGORIES as readonly string[]).includes(value)
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && (ALL_SEVERITIES as readonly string[]).includes(value)
}

/** Type guard used when reading potentially corrupted localStorage payloads. */
export function isSurveyResponse(value: unknown): value is SurveyResponse {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    return false
  }
  if (typeof value.barrio !== 'string' || getComuna(value.barrio) === undefined) {
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

/** jsdom/browser Storage — not Node's experimental `localStorage` global. */
function getLocalStorage(): Storage {
  return window.localStorage
}

export function loadSurveyResponses(): SurveyResponse[] {
  try {
    const raw = getLocalStorage().getItem(SURVEY_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isSurveyResponse)
  } catch {
    return []
  }
}

export function saveSurveyResponses(responses: readonly SurveyResponse[]): void {
  getLocalStorage().setItem(SURVEY_STORAGE_KEY, JSON.stringify(responses))
}

/** Appends one response and returns the updated list. */
export function appendSurveyResponse(response: SurveyResponse): SurveyResponse[] {
  const next = [...loadSurveyResponses(), response]
  saveSurveyResponses(next)
  return next
}

export function createSurveyResponse(input: {
  barrio: string
  category: ComplaintCategory
  severity: Severity
  description: string
}): SurveyResponse {
  const comuna = getComuna(input.barrio)
  if (!comuna) {
    throw new Error(`Barrio desconocido: "${input.barrio}"`)
  }
  return {
    id: crypto.randomUUID(),
    barrio: input.barrio,
    comuna,
    category: input.category,
    severity: input.severity,
    description: input.description,
    date: new Date().toISOString(),
  }
}