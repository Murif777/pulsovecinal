import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LoginPage from '../LoginPage'
import { installMemoryLocalStorage } from './memoryLocalStorage'
import {
  createFetchMock,
  errorJson,
  installFetchMock,
  okJson,
  uninstallFetchMock,
} from '../../../lib/__tests__/fetchMock'

/** Body served by the fake backend for POST /api/auth/login. */
const AUTH_BODY = {
  token: 'jwt-token',
  usuario: { id: 1, usuario: 'analista', rol: 'analista', nombre: 'Analista Demo' },
}

const fetchMock = createFetchMock()

/** Renders the login page with a fake /dashboard destination to observe navigation. */
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard destino</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function submit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  installMemoryLocalStorage()
  installFetchMock(fetchMock)
})

afterEach(() => {
  uninstallFetchMock()
})

describe('LoginPage', () => {
  it('renders the form with the demo hint credentials visible', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Iniciar sesión')
    expect(screen.getByLabelText('Usuario')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
    expect(screen.getByText('analista')).toBeTruthy()
    expect(screen.getByText('pulso2026')).toBeTruthy()
  })

  it('shows an alert with the API 401 detail and does not navigate with wrong credentials', async () => {
    fetchMock.mockResolvedValue(errorJson(401, { detail: 'Credenciales inválidas' }))
    renderLogin()

    submit('analista', 'mala')

    const alertElement = await screen.findByRole('alert')
    expect(alertElement.textContent ?? '').toContain('Credenciales inválidas')
    expect(screen.queryByText('Dashboard destino')).toBeNull()
  })

  it('navigates to /dashboard after a successful login', async () => {
    fetchMock.mockResolvedValue(okJson(AUTH_BODY))
    renderLogin()

    submit('analista', 'pulso2026')

    await waitFor(() => {
      expect(screen.getByText('Dashboard destino')).toBeTruthy()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows a generic error when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderLogin()

    submit('analista', 'pulso2026')

    const alertElement = await screen.findByRole('alert')
    expect(alertElement.textContent ?? '').toContain('No se pudo iniciar sesión. Intenta de nuevo.')
  })
})