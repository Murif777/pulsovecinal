import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../DashboardPage'
import { DEMO_CREDENTIALS, getSession, login } from '../auth'
import { CITIZEN_STORAGE_KEY } from '../citizenReports'
import { installMemoryLocalStorage } from './memoryLocalStorage'

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
    AreaChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    Area: () => null,
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

function viewGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Vista del dashboard' })
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<div>Iniciar sesión</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  installMemoryLocalStorage()
  login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password)
})

describe('DashboardPage', () => {
  it('renders the four KPI cards with the full dataset values (20, 15, Energía eléctrica, 2)', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dashboard de criticidad')
    expect(within(kpiCard('Reportes totales')).getByText('20')).toBeTruthy()
    expect(within(kpiCard('Barrios cubiertos')).getByText('15')).toBeTruthy()
    expect(within(kpiCard('Categoría más reportada')).getByText('Energía eléctrica (5)')).toBeTruthy()
    expect(within(kpiCard('Reportes críticos')).getByText('2')).toBeTruthy()
  })

  it('renders the ranking table with La Esperanza in the first row', () => {
    renderDashboard()

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const firstRow = rows[1]
    if (firstRow === undefined) {
      throw new Error('La tabla de ranking no tiene filas de datos')
    }
    expect(within(firstRow).getByText('La Esperanza')).toBeTruthy()
    expect(within(firstRow).getByText('7')).toBeTruthy()
  })

  it('renders the three chart containers (mocked recharts)', () => {
    renderDashboard()

    expect(screen.getAllByTestId('chart-container')).toHaveLength(3)
  })

  it('re-derives KPIs and ranking when a comuna chip is selected', () => {
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Comuna 2' }))

    expect(within(kpiCard('Reportes totales')).getByText('5')).toBeTruthy()
    expect(within(kpiCard('Barrios cubiertos')).getByText('3')).toBeTruthy()
    expect(screen.getByText('Comuna activa: Comuna 2')).toBeTruthy()
  })

  it('opens a specific report detail from the reportes view', () => {
    renderDashboard()

    fireEvent.click(within(viewGroup()).getByRole('button', { name: 'Reportes' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Reportes específicos' })).toBeTruthy()
    expect(screen.getByText('Selecciona un reporte de la tabla para ver su descripción completa.')).toBeTruthy()

    fireEvent.click(screen.getByText('Novalito'))

    expect(screen.getByText('Ruido constante de talleres mecánicos residenciales')).toBeTruthy()
    expect(screen.getByText('Diego Molina')).toBeTruthy()
  })

  it('drills down from the ranking into the reports of that barrio', () => {
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'La Esperanza' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Reportes específicos' })).toBeTruthy()
    expect(screen.getByDisplayValue('La Esperanza')).toBeTruthy()
    expect(within(kpiCard('Reportes totales')).getByText('3')).toBeTruthy()
  })

  it('includes citizen reports by default and hides them when the source toggle is unchecked', () => {
    window.localStorage.setItem(
      CITIZEN_STORAGE_KEY,
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

    renderDashboard()

    // includeCitizen defaults to true: the stored citizen report is already merged.
    expect(within(kpiCard('Reportes totales')).getByText('21')).toBeTruthy()

    fireEvent.click(screen.getByRole('checkbox', { name: /Incluir reportes ciudadanos/ }))

    expect(within(kpiCard('Reportes totales')).getByText('20')).toBeTruthy()
  })

  it('shows the active session and logs out back to /login', () => {
    renderDashboard()

    expect(screen.getByText('Sesión: analista')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Sesión' })).toBeTruthy()
    expect(getSession()?.username).toBe('analista')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(getSession()).toBeNull()
    expect(screen.getByText('Iniciar sesión')).toBeTruthy()
  })
})
