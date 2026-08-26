import { Link, NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  /** The root route only matches exactly, otherwise "/" is active everywhere. */
  end?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/encuesta', label: 'Encuestas' },
  { to: '/mapa', label: 'Mapa' },
  { to: '/dashboard', label: 'Dashboard' },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  const base =
    'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600'
  const state = isActive
    ? 'bg-teal-50 text-teal-700'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  return `${base} ${state}`
}

/** Top navigation bar shared by every route. Links wrap on small screens. */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight">PulsoVecinal</span>
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
