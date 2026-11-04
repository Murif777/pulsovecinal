import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapaPage from '../MapaPage'
import { getMapReports as computeMockReports, mockSurveyResponses } from '../../../lib/mockData'
import type { MapPoint, MapReport, SurveyResponse } from '../../../lib/types'
import {
  createFetchMock,
  errorJson,
  installFetchMock,
  okJson,
  stubRoutes,
  uninstallFetchMock,
} from '../../../lib/__tests__/fetchMock'
import type { FetchRoute } from '../../../lib/__tests__/fetchMock'

// jsdom cannot instantiate a real Leaflet map, so react-leaflet is replaced
// with functional stubs (the async factory avoids the vi.mock hoisting pitfall).
vi.mock('react-leaflet', async () => {
  const React = await import('react')
  return {
    MapContainer: React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
      ({ children }, ref) =>
        React.createElement('div', { 'data-testid': 'mapa-container', ref }, children),
    ),
    TileLayer: () => null,
    CircleMarker: () => null,
    Popup: () => null,
  }
})

const fetchMock = createFetchMock()

/**
 * Aggregated reports the fake backend serves on GET /api/mapa/reportes,
 * derived from the frozen seed (the backend already merges citizen
 * submissions, so the extra responses are passed to the aggregator here).
 */
function apiReports(extra: readonly SurveyResponse[] = []): MapReport[] {
  return computeMockReports([...mockSurveyResponses, ...extra])
}

/** Reports with a consented location, as GET /api/mapa/puntos serves them. */
const POINTS: MapPoint[] = [
  {
    id: 'p1',
    barrio: 'La Esperanza',
    comuna: 'Comuna 2',
    lat: 10.4721,
    lng: -73.2405,
    category: 'seguridad',
    severity: 'alta',
    date: '2026-10-05T14:00:00Z',
  },
  {
    id: 'p2',
    barrio: 'El Popul',
    comuna: 'Comuna 1',
    lat: 10.4589,
    lng: -73.2571,
    category: 'energia',
    severity: 'media',
    date: '2026-10-06T09:00:00Z',
  },
]

/** Routes the mock for the endpoints MapaPage consumes. */
function stubMapEndpoint(reports: MapReport[], points: MapPoint[] = POINTS) {
  stubRoutes(
    fetchMock,
    new Map<string, FetchRoute>([
      ['/api/mapa/reportes', () => okJson(reports)],
      ['/api/mapa/puntos', () => okJson(points)],
    ]),
  )
}

/** Renders the page and waits until the API reports arrive and the map mounts. */
async function renderLoadedMap() {
  render(<MapaPage />)
  await screen.findByTestId('mapa-container')
}

beforeEach(() => {
  installFetchMock(fetchMock)
  stubMapEndpoint(apiReports())
})

afterEach(() => {
  uninstallFetchMock()
})

describe('MapaPage', () => {
  it('renders the heading, filter chips, legend and the mocked map container', async () => {
    await renderLoadedMap()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Reportes en vivo')
    expect(screen.getByTestId('mapa-container')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seguridad' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crítica' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Comuna 2' })).toBeTruthy()
    expect(screen.getByText('Nivel de severidad')).toBeTruthy()
  })

  it('activates a category chip on click and reveals the clear-filters button', async () => {
    await renderLoadedMap()

    const chip = screen.getByRole('button', { name: 'Seguridad' })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByText('Limpiar filtros')).toBeNull()

    fireEvent.click(chip)

    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Limpiar filtros')).toBeTruthy()
  })

  it('renders the live summary badges with the full dataset totals', async () => {
    await renderLoadedMap()

    // The seed holds 15 barrios and 20 aggregated reports.
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('20')).toBeTruthy()
    expect(screen.getByText('Comuna activa: todas')).toBeTruthy()
  })

  it('shows the empty-state card when filters hide every barrio and recovers via its button', async () => {
    await renderLoadedMap()

    // "Otros" only exists as baja/media in the dataset, so adding "Crítica"
    // hides every barrio and the friendly empty-state card takes over.
    fireEvent.click(screen.getByRole('button', { name: 'Otros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crítica' }))

    const overlay = await screen.findByRole('status')
    expect(within(overlay).getByText('No hay barrios con esos filtros')).toBeTruthy()

    // Both the filter bar and the card offer a way out; use the card's one.
    fireEvent.click(within(overlay).getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Otros' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('15')).toBeTruthy()
  })

  it('uses the aggregated reports served by the API (citizen submissions merged server-side)', async () => {
    // A citizen registration in the same barrio+category as a mock report
    // (La Esperanza / alcantarillado) — the backend has already merged it,
    // so the API answers 21 reports while the barrio count stays at 15.
    const citizenReport: SurveyResponse = {
      id: 'citizen-001',
      barrio: 'La Esperanza',
      comuna: 'Comuna 2',
      category: 'alcantarillado',
      severity: 'alta',
      description: 'Caño destapado reportado por un vecino',
      date: '2026-08-20T10:00:00.000Z',
    }
    stubMapEndpoint(apiReports([citizenReport]))

    render(<MapaPage />)

    expect(await screen.findByText('15')).toBeTruthy()
    expect(await screen.findByText('21')).toBeTruthy()
  })

  it('shows a load error and recovers via the retry button', async () => {
    let failOnce = true
    stubRoutes(
      fetchMock,
      new Map<string, FetchRoute>([
        [
          '/api/mapa/reportes',
          () => (failOnce ? errorJson(500, { detail: 'Error interno del servidor' }) : okJson(apiReports())),
        ],
      ]),
    )

    render(<MapaPage />)

    expect(await screen.findByText('No se pudieron cargar los reportes del mapa.')).toBeTruthy()

    failOnce = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }))

    expect(await screen.findByTestId('mapa-container')).toBeTruthy()
  })
})

describe('MapaPage points layer', () => {
  it('switches to the points layer and counts the located reports', async () => {
    await renderLoadedMap()
    expect(screen.queryByText(/reportes con ubicación/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Puntos' }))

    expect(await screen.findByText(/2 reportes con ubicación/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Puntos' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Por barrio' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('applies the category filter to the points', async () => {
    await renderLoadedMap()
    fireEvent.click(screen.getByRole('button', { name: 'Puntos' }))
    await screen.findByText(/2 reportes con ubicación/)

    fireEvent.click(screen.getByRole('button', { name: 'Seguridad' }))

    expect(await screen.findByText(/1 reporte con ubicación/)).toBeTruthy()
  })

  it('explains when there are no located reports yet', async () => {
    stubMapEndpoint(apiReports(), [])
    await renderLoadedMap()

    fireEvent.click(screen.getByRole('button', { name: 'Puntos' }))

    expect(await screen.findByText('Aún no hay reportes con ubicación para estos filtros.')).toBeTruthy()
  })

  it('keeps the barrio layer working when the points request fails', async () => {
    stubRoutes(
      fetchMock,
      new Map<string, FetchRoute>([
        ['/api/mapa/reportes', () => okJson(apiReports())],
        ['/api/mapa/puntos', () => errorJson(500, { detail: 'boom' })],
      ]),
    )
    await renderLoadedMap()

    fireEvent.click(screen.getByRole('button', { name: 'Puntos' }))

    expect(await screen.findByText('No se pudieron cargar los puntos.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Por barrio' }))
    expect(screen.getByText('15')).toBeTruthy()
  })
})
