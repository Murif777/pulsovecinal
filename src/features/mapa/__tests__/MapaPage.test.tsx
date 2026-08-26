import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapaPage from '../MapaPage'

// jsdom cannot instantiate a real Leaflet map, so react-leaflet is replaced
// with functional stubs (the async factory avoids the vi.mock hoisting pitfall).
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

describe('MapaPage', () => {
  it('renders the heading, filter chips, legend and the mocked map container', () => {
    render(<MapaPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mapa interactivo')
    expect(screen.getByTestId('mapa-container')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seguridad' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crítica' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Comuna 2' })).toBeTruthy()
    expect(screen.getByText('Nivel de severidad')).toBeTruthy()
  })

  it('activates a category chip on click and reveals the clear-filters button', () => {
    render(<MapaPage />)

    const chip = screen.getByRole('button', { name: 'Seguridad' })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByText('Limpiar filtros')).toBeNull()

    fireEvent.click(chip)

    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Limpiar filtros')).toBeTruthy()
  })

  it('renders the live summary badges with the full dataset totals', () => {
    render(<MapaPage />)

    // The mock dataset holds 15 barrios and 20 aggregated reports.
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('20')).toBeTruthy()
    expect(screen.getByText('Comuna activa: todas')).toBeTruthy()
  })

  it('shows the empty-state card when filters hide every barrio and recovers via its button', () => {
    render(<MapaPage />)

    // "Otros" only exists as baja/media in the dataset, so adding "Crítica"
    // hides every barrio and the friendly empty-state card takes over.
    fireEvent.click(screen.getByRole('button', { name: 'Otros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crítica' }))

    const overlay = screen.getByRole('status')
    expect(
      within(overlay).getByText('No hay barrios con esos filtros'),
    ).toBeTruthy()

    // Both the filter bar and the card offer a way out; use the card's one.
    fireEvent.click(within(overlay).getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Otros' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('15')).toBeTruthy()
  })
})
