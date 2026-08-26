import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import EncuestaPage from './EncuestaPage'
import { installMemoryLocalStorage } from './memoryLocalStorage'
import { SURVEY_STORAGE_KEY } from './storage'

beforeEach(() => {
  installMemoryLocalStorage()
})

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Barrio'), { target: { value: 'La Esperanza' } })
  fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'seguridad' } })
  fireEvent.change(screen.getByLabelText('Urgencia'), { target: { value: 'media' } })
  fireEvent.change(screen.getByLabelText('Descripción'), {
    target: { value: 'Falta alumbrado en el parque principal' },
  })
}

describe('EncuestaPage', () => {
  it('renders the survey form and an empty list', () => {
    render(<EncuestaPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encuestas')
    expect(screen.getByRole('form')).toBeTruthy()
    expect(screen.getByLabelText('Barrio')).toBeTruthy()
    expect(screen.getByLabelText('Categoría')).toBeTruthy()
    expect(screen.getByLabelText('Urgencia')).toBeTruthy()
    expect(screen.getByLabelText('Descripción')).toBeTruthy()
    expect(screen.getByText(/Aún no has enviado reportes/)).toBeTruthy()
  })

  it('shows a field error for each empty required input on submit', () => {
    render(<EncuestaPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Selecciona un barrio', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Selecciona una categoría', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Selecciona un nivel de urgencia', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText('Describe el problema', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.queryByText('Tu reporte se guardó correctamente.')).toBeNull()
    expect(window.localStorage.getItem(SURVEY_STORAGE_KEY)).toBeNull()
  })

  it('rejects a description that is only whitespace', () => {
    render(<EncuestaPage />)

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Describe el problema', { selector: '[role="alert"]' })).toBeTruthy()
    expect(screen.getByText(/Aún no has enviado reportes/)).toBeTruthy()
  })

  it('saves a valid report to localStorage and shows it in the list', () => {
    render(<EncuestaPage />)

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Tu reporte se guardó correctamente.')).toBeTruthy()
    const list = screen.getByRole('list')
    expect(within(list).getByText('La Esperanza')).toBeTruthy()
    expect(within(list).getByText(/Comuna 2/)).toBeTruthy()
    expect(within(list).getByText(/Seguridad/)).toBeTruthy()
    expect(within(list).getByText(/Media/)).toBeTruthy()
    expect(within(list).getByText('Falta alumbrado en el parque principal')).toBeTruthy()

    const stored = JSON.parse(window.localStorage.getItem(SURVEY_STORAGE_KEY) ?? '[]') as unknown[]
    expect(stored).toHaveLength(1)
  })

  it('resets the form after a successful submit', () => {
    render(<EncuestaPage />)

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect((screen.getByLabelText('Barrio') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Categoría') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Urgencia') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe('')
  })

  it('keeps saved reports after the page is remounted', () => {
    const { unmount } = render(<EncuestaPage />)

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    unmount()

    render(<EncuestaPage />)

    expect(screen.getByText('Falta alumbrado en el parque principal')).toBeTruthy()
    expect(within(screen.getByRole('list')).getByText('La Esperanza')).toBeTruthy()
    expect(screen.queryByText(/Aún no has enviado reportes/)).toBeNull()
  })
})
