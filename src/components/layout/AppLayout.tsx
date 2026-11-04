import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

/**
 * Application shell: navbar on top, routed page content in the middle,
 * footer at the bottom. Rendered once from the root route in App.tsx.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-slate-900">
      <a
        href="#contenido"
        className="sr-only z-[2000] rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-paper focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
