import type {
  ComplaintCategory,
  DashboardSummary,
  MapReport,
  Severity,
  SurveyResponse,
} from './types'

/**
 * HTTP client for the PulsoVecinal backend API.
 *
 * The base path is RELATIVE (`/api`): in development Vite proxies it to
 * http://localhost:8000 (vite.config.ts) and in production nginx routes it to
 * the backend container (nginx.conf). Every endpoint wrapper below mirrors a
 * frozen contract of the FastAPI backend — no new dependencies, plain fetch.
 */

export const API_BASE = '/api'

/** localStorage key of the persisted session (shared with dashboard/auth). */
export const SESSION_STORAGE_KEY = 'pulsovecinal.session'

/** Error thrown for non-ok API responses; carries the HTTP status. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Barrio catalog entry returned by GET /api/barrios. */
export interface BarrioInfo {
  readonly nombre: string
  readonly comuna: string
  readonly lat: number
  readonly lng: number
}

/** Public user profile returned by the auth endpoints. */
export interface ApiUser {
  readonly id: number
  readonly usuario: string
  readonly rol: string
  readonly nombre?: string
}

/** Payload of POST /api/auth/login. */
export interface ApiLoginResponse {
  readonly token: string
  readonly usuario: ApiUser
}

/** Body of POST /api/encuestas. `encuestador` is omitted: the form does not collect it. */
export interface SurveyCreateBody {
  readonly barrio: string
  readonly category: ComplaintCategory
  readonly severity: Severity
  readonly description?: string
}

function getLocalStorage(): Storage {
  return window.localStorage
}

/** Bearer token of the persisted session, or null when there is none. */
function readSessionToken(): string | null {
  try {
    const raw = getLocalStorage().getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }
    const token = (parsed as { readonly token?: unknown }).token
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch {
    return null
  }
}

/** Removes the persisted session (called on 401 so guards redirect to /login). */
export function clearSession(): void {
  getLocalStorage().removeItem(SESSION_STORAGE_KEY)
}

/** Authorization header for the current session, when one is stored. */
function authHeaders(): Record<string, string> {
  const token = readSessionToken()
  return token === null ? {} : { Authorization: `Bearer ${token}` }
}

/** Serializes params into a query string, skipping undefined and empty values. */
function buildQuery(params: Record<string, string | undefined> | undefined): string {
  if (params === undefined) {
    return ''
  }
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1].length > 0,
  )
  if (entries.length === 0) {
    return ''
  }
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return `?${query}`
}

/**
 * Extracts a human-readable message from a non-ok response body.
 * The backend reports errors as `{"detail": "mensaje"}`; FastAPI validation
 * errors (422) use `{"detail": [{ "msg": "..." }]}` instead.
 */
async function readDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) {
      return ''
    }
    const detail = (body as { readonly detail?: unknown }).detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (typeof first === 'object' && first !== null) {
        const msg = (first as { readonly msg?: unknown }).msg
        if (typeof msg === 'string') {
          return msg
        }
      }
    }
    return ''
  } catch {
    return ''
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const detail = await readDetail(response)
  return new ApiError(response.status, detail.length > 0 ? detail : `Error ${response.status}`)
}

/** GET against the API; optional query params (empty/undefined values are dropped). */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}${buildQuery(params)}`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

/** POST a JSON body against the API. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

/** GET /api/barrios — Valledupar barrio registry with coordinates. */
export function getBarrios(): Promise<BarrioInfo[]> {
  return apiGet<BarrioInfo[]>('/barrios')
}

/** POST /api/encuestas — registers one citizen survey response. */
export function createSurvey(body: SurveyCreateBody): Promise<SurveyResponse> {
  return apiPost<SurveyResponse>('/encuestas', body)
}

/** GET /api/encuestas — lists survey responses, optionally filtered. */
export function getSurveys(
  params?: Record<string, string | undefined>,
): Promise<SurveyResponse[]> {
  return apiGet<SurveyResponse[]>('/encuestas', params)
}

/** GET /api/mapa/reportes — aggregated report per (barrio, category). */
export function getMapReports(
  params?: Record<string, string | undefined>,
): Promise<MapReport[]> {
  return apiGet<MapReport[]>('/mapa/reportes', params)
}

/** GET /api/dashboard/resumen — criticality summary of all barrios. */
export function getDashboardSummary(
  params?: Record<string, string | undefined>,
): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/resumen', params)
}

/** POST /api/auth/login — exchanges credentials for a JWT + profile. */
export function login(usuario: string, contrasena: string): Promise<ApiLoginResponse> {
  return apiPost<ApiLoginResponse>('/auth/login', { usuario, contrasena })
}

/** GET /api/auth/me — current user profile (Bearer token required). */
export function getMe(): Promise<ApiUser> {
  return apiGet<ApiUser>('/auth/me')
}