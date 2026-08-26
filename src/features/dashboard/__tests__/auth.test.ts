import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_CREDENTIALS,
  getSession,
  isAuthenticated,
  login,
  logout,
  SESSION_STORAGE_KEY,
} from '../auth'
import { installMemoryLocalStorage } from './memoryLocalStorage'

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('login', () => {
  it('accepts the demo credentials and persists the session in pulsovecinal.session', () => {
    const ok = login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password)

    expect(ok).toBe(true)
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy()
    const session = getSession()
    expect(session?.username).toBe('analista')
    expect(session?.loggedInAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rejects wrong credentials without writing anything', () => {
    const ok = login('analista', 'incorrecta')

    expect(ok).toBe(false)
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('logout', () => {
  it('clears the stored session', () => {
    login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password)
    expect(isAuthenticated()).toBe(true)

    logout()

    expect(isAuthenticated()).toBe(false)
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('isAuthenticated', () => {
  it('reflects whether a valid session is stored', () => {
    expect(isAuthenticated()).toBe(false)

    login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password)

    expect(isAuthenticated()).toBe(true)
  })
})

describe('getSession', () => {
  it('returns null for absent, invalid JSON and wrong-shape payloads', () => {
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ username: 42 }))
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ username: 'analista' }))
    expect(getSession()).toBeNull()
  })
})