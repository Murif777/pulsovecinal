import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'

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

/** Renders the shared route tree at a given path without the browser router. */
function renderRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the landing tagline when mounted at the root path', () => {
    renderRoute('/')

    const tagline = screen.getByRole('heading', { level: 1 })

    expect(tagline.textContent).toBe('Toma el pulso a tu barrio')
  })

  it('exposes links to the three feature routes', () => {
    renderRoute('/')

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))

    expect(hrefs).toContain('/encuesta')
    expect(hrefs).toContain('/mapa')
    expect(hrefs).toContain('/dashboard')
  })

  it.each([
    ['/encuesta', 'Encuestas', 'Encuestas'],
    ['/mapa', 'Mapa', 'Mapa interactivo'],
  ])('navigates to %s when its navbar link is clicked', (_path, linkLabel, expectedTitle) => {
    renderRoute('/')

    const navbar = screen.getByRole('navigation')
    fireEvent.click(within(navbar).getByRole('link', { name: linkLabel }))

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe(expectedTitle)
  })

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

  it('renders the citizen survey form on /encuesta instead of the placeholder', () => {
    renderRoute('/encuesta')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encuestas')
    expect(screen.getByRole('form')).toBeTruthy()
    expect(screen.getByLabelText('Barrio')).toBeTruthy()
    expect(screen.queryByText(/En construcción/)).toBeNull()
  })
})
