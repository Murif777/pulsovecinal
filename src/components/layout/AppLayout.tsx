import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

/**
 * Application shell: navbar on top, routed page content in the middle,
 * footer at the bottom. Rendered once from the root route in App.tsx.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
