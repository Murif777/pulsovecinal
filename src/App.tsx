import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './features/dashboard/DashboardPage'
import EncuestaPage from './features/encuesta/EncuestaPage'
import LandingPage from './features/landing/LandingPage'
import MapaPage from './features/mapa/MapaPage'

/**
 * Shared route tree — stable after Slice 2 (frozen per the TBD rule in PLAN.md).
 * Feature teams fill in their pages under src/features/<feature>/ without touching this file.
 * Exported so tests can render it inside a MemoryRouter.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="encuesta" element={<EncuestaPage />} />
        <Route path="mapa" element={<MapaPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
