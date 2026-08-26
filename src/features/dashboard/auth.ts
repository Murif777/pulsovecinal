/**
 * Simulated session helpers for the /dashboard demo gate.
 *
 * DEMO ONLY — this is an academic demonstration, NOT real security: fixed
 * credentials checked in the browser and a session persisted in localStorage.
 * There is no backend, no JWT and no server-side session by design (see the
 * README). Do not use this pattern in production.
 */

export const SESSION_STORAGE_KEY = 'pulsovecinal.session'

/** Fixed demo credentials, shown as a hint on the login page. */
export const DEMO_CREDENTIALS = {
  username: 'analista',
  password: 'pulso2026',
} as const

/** Shape of a persisted session. */
export interface Session {
  readonly username: string
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
  if (typeof value.username !== 'string' || value.username.length === 0) {
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
 * Validates the demo credentials and persists the session on success.
 * Returns false (without writing anything) when the credentials are wrong.
 */
export function login(username: string, password: string): boolean {
  if (username !== DEMO_CREDENTIALS.username || password !== DEMO_CREDENTIALS.password) {
    return false
  }
  const session: Session = { username, loggedInAt: new Date().toISOString() }
  getLocalStorage().setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  return true
}

/** Clears the stored session. */
export function logout(): void {
  getLocalStorage().removeItem(SESSION_STORAGE_KEY)
}