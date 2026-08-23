import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'

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
    ['/dashboard', 'Dashboard', 'Dashboard'],
  ])('navigates to %s when its navbar link is clicked', (_path, linkLabel, expectedTitle) => {
    renderRoute('/')

    const navbar = screen.getByRole('navigation')
    fireEvent.click(within(navbar).getByRole('link', { name: linkLabel }))

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe(expectedTitle)
  })
})
