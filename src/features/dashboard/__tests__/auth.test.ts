import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSession, isAuthenticated, login, logout, SESSION_STORAGE_KEY } from '../auth'
import { installMemoryLocalStorage } from './memoryLocalStorage'
import {
  createFetchMock,
  errorJson,
  installFetchMock,
  okJson,
  uninstallFetchMock,
} from '../../../lib/__tests__/fetchMock'

/** Body served by the fake backend for POST /api/auth/login. */
const AUTH_BODY = {
  token: 'jwt-token',
  usuario: { id: 1, usuario: 'analista', rol: 'analista', nombre: 'Analista Demo' },
}

const fetchMock = createFetchMock()

beforeEach(() => {
  installMemoryLocalStorage()
  installFetchMock(fetchMock)
})

afterEach(() => {
  uninstallFetchMock()
})

describe('login', () => {
  it('posts the credentials to /api/auth/login and persists token + usuario', async () => {
    fetchMock.mockResolvedValue(okJson(AUTH_BODY))

    const response = await login('analista', 'pulso2026')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'analista', contrasena: 'pulso2026' }),
    })
    expect(response.token).toBe('jwt-token')
    expect(response.usuario.usuario).toBe('analista')

    const session = getSession()
    expect(session?.token).toBe('jwt-token')
    expect(session?.usuario.usuario).toBe('analista')
    expect(session?.usuario.nombre).toBe('Analista Demo')
    expect(session?.loggedInAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rejects with the API 401 detail without writing anything', async () => {
    fetchMock.mockResolvedValue(errorJson(401, { detail: 'Credenciales inválidas' }))

    await expect(login('analista', 'incorrecta')).rejects.toThrow('Credenciales inválidas')
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('logout', () => {
  it('clears the stored session', async () => {
    fetchMock.mockResolvedValue(okJson(AUTH_BODY))
    await login('analista', 'pulso2026')
    expect(isAuthenticated()).toBe(true)

    logout()

    expect(isAuthenticated()).toBe(false)
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('isAuthenticated', () => {
  it('reflects whether a valid session is stored', async () => {
    expect(isAuthenticated()).toBe(false)

    fetchMock.mockResolvedValue(okJson(AUTH_BODY))
    await login('analista', 'pulso2026')

    expect(isAuthenticated()).toBe(true)
  })
})

describe('getSession', () => {
  it('returns null for absent, invalid JSON and wrong-shape payloads', () => {
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: 42 }))
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: 't' }))
    expect(getSession()).toBeNull()

    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 't', usuario: { usuario: 'analista' }, loggedInAt: 'x' }),
    )
    expect(getSession()).toBeNull()
  })
})