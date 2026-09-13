import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSession, isAuthenticated, login, logout, SESSION_STORAGE_KEY } from '../auth'
import { installMemoryLocalStorage } from './memoryLocalStorage'

const fetchMock = vi.fn<typeof fetch>()

function okAuthResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      token: 'jwt-token',
      usuario: { id: 1, usuario: 'analista', rol: 'analista', nombre: 'Analista Demo' },
    }),
  } as unknown as Response
}

function badAuthResponse(): Response {
  return {
    ok: false,
    status: 401,
    json: async () => ({ detail: 'Credenciales inválidas' }),
  } as unknown as Response
}

beforeEach(() => {
  installMemoryLocalStorage()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('posts the credentials to /api/auth/login and persists token + usuario', async () => {
    fetchMock.mockResolvedValue(okAuthResponse())

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
    fetchMock.mockResolvedValue(badAuthResponse())

    await expect(login('analista', 'incorrecta')).rejects.toThrow('Credenciales inválidas')
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('logout', () => {
  it('clears the stored session', async () => {
    fetchMock.mockResolvedValue(okAuthResponse())
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

    fetchMock.mockResolvedValue(okAuthResponse())
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