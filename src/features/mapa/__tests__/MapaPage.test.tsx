import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MapaPage from '../MapaPage'
import { SURVEY_STORAGE_KEY } from '../../../lib/surveyStorage'
import { installMemoryLocalStorage } from '../../dashboard/__tests__/memoryLocalStorage'

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

beforeEach(() => {
  installMemoryLocalStorage()
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

  it('merges citizen responses from localStorage with the mock dataset', () => {
    // One citizen registration in the same barrio+category as a mock report
    // (La Esperanza / alcantarillado): the total report count must go 20 → 21
    // while the barrio count stays at 15.
    window.localStorage.setItem(
      SURVEY_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'citizen-001',
          barrio: 'La Esperanza',
          comuna: 'Comuna 2',
          category: 'alcantarillado',
          severity: 'alta',
          description: 'Caño destapado reportado por un vecino',
          date: '2026-08-20T10:00:00.000Z',
        },
      ]),
    )

    render(<MapaPage />)

    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('21')).toBeTruthy()
  })
})
