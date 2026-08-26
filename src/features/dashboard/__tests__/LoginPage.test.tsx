import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import LoginPage from '../LoginPage'
import { installMemoryLocalStorage } from './memoryLocalStorage'

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

beforeEach(() => {
  installMemoryLocalStorage()
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

  it('shows an alert error and does not navigate with wrong credentials', () => {
    renderLogin()

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'analista' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByText('Dashboard destino')).toBeNull()
  })

  it('navigates to /dashboard after a successful login', () => {
    renderLogin()

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'analista' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'pulso2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Dashboard destino')).toBeTruthy()
  })
})