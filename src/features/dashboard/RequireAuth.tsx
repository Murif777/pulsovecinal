import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from './auth'

/**
 * Route guard for the /dashboard demo gate: without a stored session the
 * visitor is redirected to /login, remembering the route they tried so the
 * login page can return them there after a successful login.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}