import { apiPost, SESSION_STORAGE_KEY } from '../../lib/api'
import type { ApiLoginResponse, ApiUser } from '../../lib/api'

/**
 * Session helpers for the /dashboard gate, backed by the real API.
 *
 * `login` posts the credentials to POST /api/auth/login; on success the
 * returned JWT + profile are persisted in localStorage under
 * `pulsovecinal.session` so every later request attaches the Bearer token.
 * A 401 raised by the API client already clears the session, so guards
 * redirect to /login.
 */

export { SESSION_STORAGE_KEY }

/** Shape of a persisted session. */
export interface Session {
  readonly token: string
  readonly usuario: ApiUser
  /** ISO 8601 timestamp of when the session was created. */
  readonly loggedInAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Type guard for a well-formed stored session payload. */
export function isSession(value: unknown): value is Session {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.token !== 'string' || value.token.length === 0) {
    return false
  }
  const usuario = value.usuario
  if (!isRecord(usuario)) {
    return false
  }
  if (typeof usuario.id !== 'number' || typeof usuario.usuario !== 'string') {
    return false
  }
  if (typeof value.loggedInAt !== 'string' || value.loggedInAt.length === 0) {
    return false
  }
  return true
}

/** jsdom/browser Storage — not Node's experimental `localStorage` global. */
function getLocalStorage(): Storage {
  return window.localStorage
}

/** Returns the stored session, or null when absent or corrupted. */
export function getSession(): Session | null {
  try {
    const raw = getLocalStorage().getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Whether a valid session is currently stored. */
export function isAuthenticated(): boolean {
  return getSession() !== null
}

/**
 * Authenticates against the real API and persists the session on success.
 * Rejects with the ApiError raised by the client (401 + backend detail)
 * when the credentials are wrong.
 */
export async function login(usuario: string, contrasena: string): Promise<ApiLoginResponse> {
  const response = await apiPost<ApiLoginResponse>('/auth/login', { usuario, contrasena })
  const session: Session = {
    token: response.token,
    usuario: response.usuario,
    loggedInAt: new Date().toISOString(),
  }
  getLocalStorage().setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  return response
}

/** Clears the stored session. */
export function logout(): void {
  getLocalStorage().removeItem(SESSION_STORAGE_KEY)
}