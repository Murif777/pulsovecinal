import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LegalPage from './LegalPage'
import { LEGAL_VERSION } from './legalConfig'

describe('LegalPage', () => {
  it('renders the policy with its version and the main sections', () => {
    render(<LegalPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Política de datos y consentimiento')
    expect(screen.getByText(new RegExp(`Versión ${LEGAL_VERSION}`))).toBeTruthy()
    for (const title of [
      'Quién trata tus datos',
      'Tu consentimiento sobre la ubicación',
      'Qué tan exacta es y qué se publica',
      'Tus derechos',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy()
    }
  })

  it('states the 20 m accuracy requirement and the legal framework', () => {
    render(<LegalPage />)

    expect(screen.getByText(/20 metros o menos/)).toBeTruthy()
    expect(screen.getByText(/Ley 1581 de 2012, régimen general/)).toBeTruthy()
  })

  it('links every table-of-contents entry to an existing section', () => {
    const { container } = render(<LegalPage />)
    const nav = screen.getByRole('navigation', { name: 'Contenido de la política' })

    const links = within(nav).getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(8)
    for (const link of links) {
      const id = link.getAttribute('href')?.slice(1) ?? ''
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })
})
