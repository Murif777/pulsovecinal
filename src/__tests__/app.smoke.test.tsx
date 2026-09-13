import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'
import { getMapReports as computeMockReports, mockSurveyResponses } from '../lib/mockData'
import {
  createFetchMock,
  installFetchMock,
  okJson,
  stubRoutes,
  uninstallFetchMock,
} from '../lib/__tests__/fetchMock'
import type { FetchRoute } from '../lib/__tests__/fetchMock'

// jsdom cannot instantiate a real Leaflet map, so /mapa is rendered with
// functional stubs (the async factory avoids the vi.mock hoisting pitfall).
vi.mock('react-leaflet', async () => {
  const React = await import('react')
  return {
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mapa-container' }, children),
    TileLayer: () => null,
    CircleMarker: () => null,
    Popup: () => null,
  }
})

const fetchMock = createFetchMock()

/** Barrio registry served to /encuesta (same fixture as the EncuestaPage tests). */
const BARRIOS_FIXTURE = [
  { nombre: 'La Esperanza', comuna: 'Comuna 2', lat: 10.461, lng: -73.248 },
  { nombre: 'Novalito', comuna: 'Comuna 2', lat: 10.455, lng: -73.24 },
]

/**
 * Default fake backend for the whole route tree: every page reads the same
 * endpoints it consumes in production, so each route renders loaded instead
 * of falling into the error state (which used to happen against real fetch,
 * leaking act warnings on unmounting async work).
 */
function defaultRoutes() {
  stubRoutes(
    fetchMock,
    new Map<string, FetchRoute>([
      ['/api/barrios', () => okJson(BARRIOS_FIXTURE)],
      ['/api/encuestas', () => okJson([])],
      ['/api/mapa/reportes', () => okJson(computeMockReports(mockSurveyResponses))],
    ]),
  )
}

beforeEach(() => {
  installFetchMock(fetchMock)
  defaultRoutes()
})

afterEach(() => {
  uninstallFetchMock()
})

/** Renders the shared route tree at a given path without the browser router. */
function renderRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

/** One navigation case: the navbar link label, the target heading and the async
 * signal that the destination page finished loading its API data. */
type NavCase = readonly [linkLabel: string, expectedTitle: string, awaitReady: () => Promise<HTMLElement>]

const navCases: readonly NavCase[] = [
  ['Encuestas', 'Encuestas', () => screen.findByRole('option', { name: 'La Esperanza' })],
  ['Mapa', 'Mapa interactivo', () => screen.findByTestId('mapa-container')],
]

describe('App', () => {
  it('renders the landing tagline when mounted at the root path', () => {
    renderRoute('/')

    const tagline = screen.getByRole('heading', { level: 1 })

    expect(tagline.textContent).toBe('Toma el pulso a tu barrio')
  })

  it('exposes links to the feature routes and login', () => {
    renderRoute('/')

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))

    expect(hrefs).toContain('/encuesta')
    expect(hrefs).toContain('/mapa')
    expect(hrefs).toContain('/login')
  })

  it.each(navCases)(
    'navigates to %s when its navbar link is clicked',
    async (linkLabel, expectedTitle, awaitReady) => {
      renderRoute('/')

      const navbar = screen.getByRole('navigation')
      fireEvent.click(within(navbar).getByRole('link', { name: linkLabel }))

      await awaitReady()

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toBe(expectedTitle)
    },
  )

  it('redirects to /login when /dashboard is accessed without a session', () => {
    renderRoute('/dashboard')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Iniciar sesión')
  })

  it('renders the login form at /login', () => {
    renderRoute('/login')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Iniciar sesión')
    expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.getByText('analista')).toBeTruthy()
    expect(screen.getByText('pulso2026')).toBeTruthy()
  })

  it('renders the citizen survey form on /encuesta instead of the placeholder', async () => {
    renderRoute('/encuesta')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encuestas')
    expect(screen.getByRole('form')).toBeTruthy()
    expect(screen.getByLabelText('Barrio')).toBeTruthy()
    expect(screen.queryByText(/En construcción/)).toBeNull()

    // Flush the barrios fetch so the test ends with no pending async work.
    await screen.findByRole('option', { name: 'La Esperanza' })
  })
})