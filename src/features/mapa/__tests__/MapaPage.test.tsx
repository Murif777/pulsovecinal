import { fireEvent, render, screen } from '@testing-library/react'
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
})
