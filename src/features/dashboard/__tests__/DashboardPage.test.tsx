import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from '../DashboardPage'

// jsdom cannot measure real sizes (ResponsiveContainer uses ResizeObserver),
// so recharts is replaced with functional stubs (the async factory avoids the
// vi.mock hoisting pitfall — identical pattern to the react-leaflet mock).
vi.mock('recharts', async () => {
  const React = await import('react')
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'chart-container' }, children),
    BarChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    PieChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    Pie: () => null,
    Cell: () => null,
    Legend: () => null,
  }
})

/** Climbs from a KPI label to its card so value assertions stay scoped. */
function kpiCard(label: string): HTMLElement {
  const labelNode = screen.getByText(label)
  const card = labelNode.closest('div.rounded-xl')
  if (card === null) {
    throw new Error(`No se encontró la KPI card con label "${label}"`)
  }
  return card as HTMLElement
}

describe('DashboardPage', () => {
  it('renders the four KPI cards with the full dataset values (20, 15, Energía eléctrica, 2)', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dashboard de criticidad')
    expect(within(kpiCard('Reportes totales')).getByText('20')).toBeTruthy()
    expect(within(kpiCard('Barrios cubiertos')).getByText('15')).toBeTruthy()
    expect(within(kpiCard('Categoría más reportada')).getByText('Energía eléctrica (5)')).toBeTruthy()
    expect(within(kpiCard('Reportes críticos')).getByText('2')).toBeTruthy()
  })

  it('renders the ranking table with La Esperanza in the first row', () => {
    render(<DashboardPage />)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const firstRow = rows[1]
    if (firstRow === undefined) {
      throw new Error('La tabla de ranking no tiene filas de datos')
    }
    expect(within(firstRow).getByText('La Esperanza')).toBeTruthy()
    expect(within(firstRow).getByText('7')).toBeTruthy()
  })

  it('renders both chart containers (mocked recharts)', () => {
    render(<DashboardPage />)

    expect(screen.getAllByTestId('chart-container')).toHaveLength(2)
  })

  it('re-derives KPIs and ranking when a comuna chip is selected', () => {
    render(<DashboardPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Comuna 2' }))

    expect(within(kpiCard('Reportes totales')).getByText('5')).toBeTruthy()
    expect(within(kpiCard('Barrios cubiertos')).getByText('3')).toBeTruthy()
    expect(screen.getByText('Comuna activa: Comuna 2')).toBeTruthy()
  })
})