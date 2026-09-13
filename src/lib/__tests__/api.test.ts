import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiGet,
  apiPost,
  clearSession,
  createSurvey,
  getBarrios,
  getDashboardSummary,
  getMapReports,
  getMe,
  getSurveys,
  login,
  SESSION_STORAGE_KEY,
} from '../api'

const fetchMock = vi.fn<typeof fetch>()

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function badJson(status: number, body: unknown): Response {
  return { ok: false, status, json: async () => body } as unknown as Response
}

function seedSession(): void {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      token: 'jwt-token',
      usuario: { id: 1, usuario: 'analista', rol: 'analista' },
      loggedInAt: '2026-08-19T13:55:00.000Z',
    }),
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiGet', () => {
  it('requests the resolved path with the /api base prefix', async () => {
    fetchMock.mockResolvedValue(okJson({ ok: true }))

    await apiGet('/barrios')

    expect(fetchMock).toHaveBeenCalledWith('/api/barrios', { headers: {} })
  })

  it('builds a query string that skips undefined and empty params', async () => {
    fetchMock.mockResolvedValue(okJson([]))

    await apiGet('/encuestas', { comuna: 'Comuna 2', category: undefined, from: '', severity: 'alta' })

    expect(fetchMock).toHaveBeenCalledWith('/api/encuestas?comuna=Comuna%202&severity=alta', {
      headers: {},
    })
  })

  it('omits the query string when every param is empty', async () => {
    fetchMock.mockResolvedValue(okJson([]))

    await apiGet('/encuestas', { comuna: undefined, from: '' })

    expect(fetchMock).toHaveBeenCalledWith('/api/encuestas', { headers: {} })
  })

  it('attaches the bearer token when a session is stored', async () => {
    seedSession()
    fetchMock.mockResolvedValue(okJson({}))

    await apiGet('/auth/me')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      headers: { Authorization: 'Bearer jwt-token' },
    })
  })

  it('sends no auth header without a session', async () => {
    fetchMock.mockResolvedValue(okJson([]))

    await apiGet('/barrios')

    expect(fetchMock).toHaveBeenCalledWith('/api/barrios', { headers: {} })
  })
})

describe('apiPost', () => {
  it('sends a JSON body with the content-type header', async () => {
    fetchMock.mockResolvedValue(okJson({ id: 'r-1' }))

    await apiPost('/encuestas', { barrio: 'La Esperanza' })

    expect(fetchMock).toHaveBeenCalledWith('/api/encuestas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barrio: 'La Esperanza' }),
    })
  })

  it('adds the bearer token to non-auth POSTs when there is a session', async () => {
    seedSession()
    fetchMock.mockResolvedValue(okJson({ id: 'r-1' }))

    await apiPost('/encuestas', { barrio: 'El Popul' })

    expect(fetchMock).toHaveBeenCalledWith('/api/encuestas', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ barrio: 'El Popul' }),
    })
  })
})

describe('error handling', () => {
  it('throws ApiError with the parsed detail and the HTTP status', async () => {
    fetchMock.mockResolvedValue(badJson(401, { detail: 'Credenciales inválidas' }))

    const error = await apiGet('/auth/me').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(401)
    expect(apiError.message).toBe('Credenciales inválidas')
  })

  it('extracts the msg of FastAPI 422 validation details', async () => {
    fetchMock.mockResolvedValue(badJson(422, { detail: [{ loc: ['body', 'barrio'], msg: 'Barrio no existe', type: 'value_error' }] }))

    const error = await apiPost('/encuestas', { barrio: 'Inventado' }).catch((err: unknown) => err)

    expect((error as ApiError).message).toBe('Barrio no existe')
  })

  it('falls back to a generic message when the body has no detail', async () => {
    fetchMock.mockResolvedValue(badJson(500, 'not json object'))

    const error = await apiGet('/barrios').catch((err: unknown) => err)

    expect((error as ApiError).message).toBe('Error 500')
  })

  it('clears the stored session on 401', async () => {
    seedSession()
    fetchMock.mockResolvedValue(badJson(401, { detail: 'Credenciales inválidas' }))

    await apiGet('/auth/me').catch(() => undefined)

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('keeps the session on other statuses', async () => {
    seedSession()
    fetchMock.mockResolvedValue(badJson(422, { detail: 'Barrio no existe' }))

    await apiPost('/encuestas', { barrio: 'Inventado' }).catch(() => undefined)

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  })
})

describe('clearSession', () => {
  it('removes the persisted session', () => {
    seedSession()

    clearSession()

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('endpoint wrappers', () => {
  it('expose every read contract with the exact backend paths', async () => {
    fetchMock.mockResolvedValue(okJson([]))

    await getBarrios()
    await getSurveys({ comuna: 'Comuna 2' })
    await getMapReports()
    await getDashboardSummary()

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/barrios',
      '/api/encuestas?comuna=Comuna%202',
      '/api/mapa/reportes',
      '/api/dashboard/resumen',
    ])
  })

  it('login posts the credentials and createSurvey posts the survey body', async () => {
    fetchMock.mockResolvedValue(okJson({ token: 't', usuario: { id: 1, usuario: 'analista', rol: 'analista' } }))

    await login('analista', 'pulso2026')
    await createSurvey({ barrio: 'La Esperanza', category: 'seguridad', severity: 'alta' })

    expect(fetchMock.mock.calls[0]).toEqual([
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'analista', contrasena: 'pulso2026' }),
      },
    ])
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/encuestas')
  })

  it('getMe requests the authenticated profile', async () => {
    seedSession()
    fetchMock.mockResolvedValue(okJson({ id: 1, usuario: 'analista', rol: 'analista' }))

    await getMe()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/me')
  })
})