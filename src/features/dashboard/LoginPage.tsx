import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from './auth'

/** Decorative heartbeat glyph for the login card (the PulsoVecinal mark). */
function PulseMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12h4l3-8 4 16 3-8h6" />
    </svg>
  )
}

/**
 * /login page: centered demo gate for the dashboard. Rendered OUTSIDE the
 * AppLayout (no navbar) so the card stays clean. Reads the route the user
 * originally tried (`location.state.from`, set by RequireAuth) and returns
 * there after a successful login.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (login(username, password)) {
      navigate(from, { replace: true })
    } else {
      setError('Credenciales incorrectas. Revisa el hint de la demo.')
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          <PulseMark />
          PulsoVecinal · Valledupar
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Accede al dashboard de criticidad barrial.
        </p>

        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800">
          <strong className="font-semibold">Demo académica</strong> — usuario:{' '}
          <code className="font-semibold">analista</code> · contraseña:{' '}
          <code className="font-semibold">pulso2026</code>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-label="Iniciar sesión">
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Entrar
          </button>
        </form>
      </div>
    </section>
  )
}