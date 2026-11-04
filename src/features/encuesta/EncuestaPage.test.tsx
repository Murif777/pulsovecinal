import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EncuestaPage from './EncuestaPage'
import {
  createFetchMock,
  errorJson,
  installFetchMock,
  okJson,
  stubRoutes,
  uninstallFetchMock,
} from '../../lib/__tests__/fetchMock'
import type { FetchRoute } from '../../lib/__tests__/fetchMock'

const fetchMock = createFetchMock()

const BARRIOS_FIXTURE = [
  { nombre: 'La Esperanza', comuna: 'Comuna 2', lat: 10.461, lng: -73.248 },
  { nombre: 'Novalito', comuna: 'Comuna 2', lat: 10.455, lng: -73.24 },
]

/** Responses the fake backend returns for GET /api/encuestas (reset per test). */
let storedResponses: unknown[] = []

/**
 * Default fake backend: barrios + GET/POST encuestas backed by `storedResponses`.
 * A POST replaces the store with the created report, mirroring the single-user demo.
 */
function installDefaultBackend() {
  stubRoutes(
    fetchMock,
    new Map<string, FetchRoute>([
      ['/api/barrios', () => okJson(BARRIOS_FIXTURE)],
      [
        '/api/encuestas',
        (_input, init) => {
          if ((init?.method ?? 'GET') === 'POST') {
            const body = JSON.parse(String(init?.body)) as {
              barrio: string
              category: string
              severity: string
              description?: string
            }
            const created = {
              id: 'citizen-001',
              barrio: body.barrio,
              comuna: BARRIOS_FIXTURE.find((barrio) => barrio.nombre === body.barrio)?.comuna ?? '',
              category: body.category,
              severity: body.severity,
              description: body.description,
              date: '2026-08-20T10:00:00.000Z',
            }
            storedResponses = [created]
            return okJson(created, 201)
          }
          return okJson(storedResponses)
        },
      ],
    ]),
  )
}

/** Renders the page and waits until the barrio registry arrives from the API. */
async function renderPage() {
  render(<EncuestaPage />)
  await screen.findByRole('option', { name: 'La Esperanza' })
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Barrio'), { target: { value: 'La Esperanza' } })
  fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'seguridad' } })
  fireEvent.change(screen.getByLabelText('Urgencia'), { target: { value: 'media' } })
  fireEvent.change(screen.getByLabelText('Descripción'), {
    target: { value: 'Falta alumbrado en el parque principal' },
  })
}

beforeEach(() => {
  storedResponses = []
  installFetchMock(fetchMock)
  installDefaultBackend()
})

afterEach(() => {
  uninstallFetchMock()
})

describe('EncuestaPage', () => {
  it('renders the survey form and an empty list fed by the API', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Participa')
    expect(screen.getByRole('form')).toBeTruthy()
    expect(screen.getByLabelText('Barrio')).toBeTruthy()
    expect(screen.getByLabelText('Categoría')).toBeTruthy()
    expect(screen.getByLabelText('Urgencia')).toBeTruthy()
    expect(screen.getByLabelText('Descripción')).toBeTruthy()
    expect(await screen.findByText(/Aún no has enviado reportes/)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/barrios', { headers: {} })
  })

  it('shows a field error for each empty required input on submit', async () => {
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Selecciona un barrio', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Selecciona una categoría', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Selecciona un nivel de urgencia', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Describe el problema', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.queryByText('Tu reporte se guardó correctamente.')).toBeNull()
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) => (init?.method ?? 'GET') === 'POST' && String(input) === '/api/encuestas',
      ),
    ).toBe(false)
  })

  it('rejects a description that is only whitespace', async () => {
    await renderPage()

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Describe el problema', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText(/Aún no has enviado reportes/)).toBeTruthy()
  })

  it('posts a valid report to the API and shows a compact row in the list', async () => {
    await renderPage()

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await screen.findByText('Tu reporte se guardó correctamente.')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/encuestas',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barrio: 'La Esperanza',
          category: 'seguridad',
          severity: 'media',
          description: 'Falta alumbrado en el parque principal',
        }),
      }),
    )

    const list = screen.getByRole('list')
    expect(within(list).getByText('La Esperanza')).toBeTruthy()
    expect(within(list).getByText(/Comuna 2/)).toBeTruthy()
    expect(within(list).getByText(/Seguridad/)).toBeTruthy()
    expect(within(list).getByText(/Media/)).toBeTruthy()
    expect(within(list).queryByText('Falta alumbrado en el parque principal')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver detalles del reporte en La Esperanza' })).toBeTruthy()
  })

  it('resets the form after a successful submit', async () => {
    await renderPage()

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() => {
      expect((screen.getByLabelText('Barrio') as HTMLSelectElement).value).toBe('')
      expect((screen.getByLabelText('Categoría') as HTMLSelectElement).value).toBe('')
      expect((screen.getByLabelText('Urgencia') as HTMLSelectElement).value).toBe('')
      expect((screen.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe('')
    })
  })

  it('keeps saved reports when the page is remounted', async () => {
    const { unmount } = render(<EncuestaPage />)
    await screen.findByRole('option', { name: 'La Esperanza' })

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Tu reporte se guardó correctamente.')
    unmount()

    await renderPage()

    expect(screen.queryByText('Falta alumbrado en el parque principal')).toBeNull()
    expect(within(screen.getByRole('list')).getByText('La Esperanza')).toBeTruthy()
    expect(screen.queryByText(/Aún no has enviado reportes/)).toBeNull()
  })

  it('opens a detail card from the eye button and closes it', async () => {
    await renderPage()

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Tu reporte se guardó correctamente.')
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles del reporte en La Esperanza' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle del reporte' })
    expect(within(dialog).getByText('Falta alumbrado en el parque principal')).toBeTruthy()
    expect(within(dialog).getByText('La Esperanza')).toBeTruthy()
    expect(within(dialog).getByText('Comuna 2')).toBeTruthy()
    expect(within(dialog).getByText('Seguridad')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps a long unbreakable description out of the list until details open', async () => {
    const longDescription = 'a'.repeat(80)
    await renderPage()

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: longDescription } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Tu reporte se guardó correctamente.')

    expect(within(screen.getByRole('list')).queryByText(longDescription)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles del reporte en La Esperanza' }))
    expect(within(screen.getByRole('dialog')).getByText(longDescription)).toBeTruthy()
  })

  it('shows a load error for the barrios and retries', async () => {
    let barriosOk = false
    stubRoutes(
      fetchMock,
      new Map<string, FetchRoute>([
        [
          '/api/barrios',
          () => (barriosOk ? okJson(BARRIOS_FIXTURE) : errorJson(500, { detail: 'Error interno del servidor' })),
        ],
        ['/api/encuestas', () => okJson(storedResponses)],
      ]),
    )

    render(<EncuestaPage />)

    expect(await screen.findByText('No se pudieron cargar los barrios.')).toBeTruthy()

    barriosOk = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar barrios' }))

    expect(await screen.findByRole('option', { name: 'La Esperanza' })).toBeTruthy()
  })

  it('shows a submit error and keeps the form values for correction', async () => {
    stubRoutes(
      fetchMock,
      new Map<string, FetchRoute>([
        ['/api/barrios', () => okJson(BARRIOS_FIXTURE)],
        [
          '/api/encuestas',
          (_input, init) => {
            if ((init?.method ?? 'GET') === 'POST') {
              return errorJson(422, { detail: 'Barrio no existe' })
            }
            return okJson(storedResponses)
          },
        ],
      ]),
    )

    render(<EncuestaPage />)
    await screen.findByRole('option', { name: 'La Esperanza' })

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('No se pudo guardar el reporte. Intenta de nuevo.')).toBeTruthy()
    expect((screen.getByLabelText('Barrio') as HTMLSelectElement).value).toBe('La Esperanza')
    expect((screen.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe(
      'Falta alumbrado en el parque principal',
    )
  })
})

describe('EncuestaPage location', () => {
  type Fix = { latitude: number; longitude: number; accuracy: number }
  type GeoSuccess = (position: { coords: Fix }) => void
  type GeoFailure = (error: { code: number }) => void

  const clearWatch = vi.fn()

  function stubGeolocation(impl: (ok: GeoSuccess, fail: GeoFailure) => void) {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((ok: GeoSuccess, fail: GeoFailure) => {
          impl(ok, fail)
          return 7
        }),
        clearWatch,
      },
    })
  }

  function authorizeAndLocate() {
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo que se guarde mi ubicación/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Agregar mi ubicación actual' }))
  }

  afterEach(() => {
    clearWatch.mockClear()
    vi.useRealTimers()
    Reflect.deleteProperty(navigator, 'geolocation')
  })

  it('keeps the location button locked until the user authorizes', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 10.461, longitude: -73.248, accuracy: 10 } }))
    await renderPage()

    const button = screen.getByRole('button', { name: 'Agregar mi ubicación actual' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo que se guarde mi ubicación/ }))
    expect(button.disabled).toBe(false)
    expect(screen.getByRole('link', { name: 'Leer la política de datos' }).getAttribute('href')).toBe('/legal')
  })

  it('attaches a fix within 20 m, suggests the nearest barrio and posts it with the consent evidence', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 10.461034, longitude: -73.247968, accuracy: 18.4 } }))
    await renderPage()

    authorizeAndLocate()

    expect(await screen.findByText(/Ubicación agregada · precisión de unos 18 m/)).toBeTruthy()
    expect((screen.getByLabelText('Barrio') as HTMLSelectElement).value).toBe('La Esperanza')
    expect(clearWatch).toHaveBeenCalledWith(7)

    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'seguridad' } })
    fireEvent.change(screen.getByLabelText('Urgencia'), { target: { value: 'media' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Falta alumbrado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await screen.findByText('Tu reporte se guardó correctamente.')
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      lat: 10.46103,
      lng: -73.24797,
      accuracy: 18,
      consent: true,
      consent_version: '2026-11-v1',
    })
  })

  it('keeps waiting while the accuracy is worse than 20 m and gives up with a clear message', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    stubGeolocation((ok) => ok({ coords: { latitude: 10.461, longitude: -73.248, accuracy: 85 } }))
    await renderPage()

    authorizeAndLocate()
    expect(await screen.findByText(/Precisión actual: 85 m/)).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(16_000)
    })

    expect(await screen.findByText(/La mejor precisión fue de unos 85 m y se necesitan 20 m o menos/)).toBeTruthy()
    expect(screen.queryByText(/Ubicación agregada/)).toBeNull()
    expect(clearWatch).toHaveBeenCalled()
  })

  it('removes the location with "Quitar" so no location fields are sent', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 10.461, longitude: -73.248, accuracy: 10 } }))
    await renderPage()

    authorizeAndLocate()
    await screen.findByText(/Ubicación agregada/)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))

    expect(screen.getByRole('button', { name: 'Agregar mi ubicación actual' })).toBeTruthy()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Tu reporte se guardó correctamente.')
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const body = JSON.parse(String(post?.[1]?.body))
    expect(body).not.toHaveProperty('lat')
    expect(body).not.toHaveProperty('consent')
  })

  it('shows a message when the user denies permission and keeps the form usable', async () => {
    stubGeolocation((_ok, fail) => fail({ code: 1 }))
    await renderPage()

    authorizeAndLocate()

    expect(await screen.findByText(/No diste permiso/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeTruthy()
  })

  it('rejects a fix outside Valledupar', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 4.711, longitude: -74.072, accuracy: 10 } }))
    await renderPage()

    authorizeAndLocate()

    expect(await screen.findByText(/fuera de Valledupar/)).toBeTruthy()
    expect(screen.queryByText(/Ubicación agregada/)).toBeNull()
  })

  it('explains when the browser has no geolocation support', async () => {
    await renderPage()

    authorizeAndLocate()

    expect(await screen.findByText(/no permite obtener la ubicación/)).toBeTruthy()
  })

  it('shows the rate-limit message returned by the API', async () => {
    stubRoutes(
      fetchMock,
      new Map<string, FetchRoute>([
        ['/api/barrios', () => okJson(BARRIOS_FIXTURE)],
        [
          '/api/encuestas',
          (_input, init) =>
            (init?.method ?? 'GET') === 'POST'
              ? errorJson(429, { detail: 'Demasiados intentos. Espera un momento e intenta de nuevo.' })
              : okJson([]),
        ],
      ]),
    )
    await renderPage()

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Demasiados intentos. Espera un momento e intenta de nuevo.')).toBeTruthy()
  })
})

describe('EncuestaPage with many reports', () => {
  it('renders the list in steps so it does not overflow, and reveals more on demand', async () => {
    storedResponses = Array.from({ length: 30 }, (_, index) => ({
      id: `r-${index}`,
      barrio: 'La Esperanza',
      comuna: 'Comuna 2',
      category: 'seguridad',
      severity: 'media',
      description: `Reporte ${index}`,
      date: new Date(Date.UTC(2026, 7, 1, 12, index)).toISOString(),
    }))
    await renderPage()

    const list = await screen.findByRole('list', { name: 'Tus reportes' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(12)

    fireEvent.click(screen.getByRole('button', { name: /Mostrar más \(18 restantes\)/ }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(24)

    fireEvent.click(screen.getByRole('button', { name: /Mostrar más \(6 restantes\)/ }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(30)
    expect(screen.queryByRole('button', { name: /Mostrar más/ })).toBeNull()
  })
})
