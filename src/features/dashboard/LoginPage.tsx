import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { login } from './auth'

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      )
    }
  }

  const inputClass =
    'mt-1.5 min-h-[2.75rem] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25'

  return (
    <section className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-pulse-500/25 blur-3xl"
          aria-hidden="true"
        />
        <a href="/" className="relative flex items-center gap-3 font-display text-2xl font-bold">
          <img src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
          <span>
            Pulso<span className="text-pulse-400">Vecinal</span>
          </span>
        </a>
        <div className="relative">
          <p className="max-w-md font-display text-5xl font-bold leading-[1.05]">
            Los reportes de los vecinos, ordenados por urgencia.
          </p>
          <svg viewBox="0 0 400 60" className="mt-10 h-14 w-full max-w-md text-pulse-400" aria-hidden="true">
            <polyline
              className="ecg-line"
              points="0,30 120,30 140,30 160,6 180,56 200,22 215,34 235,30 400,30"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="relative text-sm text-brand-200/70">Valledupar, Cesar</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Accede al dashboard de criticidad barrial.
          </p>

          <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-3.5 py-2.5 text-xs leading-5 text-brand-800">
            <strong className="font-semibold">Demo académica</strong> — usuario:{' '}
            <code className="font-semibold">analista</code> · contraseña:{' '}
            <code className="font-semibold">pulso2026</code>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-label="Iniciar sesión">
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700">
                Usuario
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-pulse-500/30 bg-pulse-500/5 px-3.5 py-2.5 text-sm font-medium text-pulse-600"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="min-h-[2.75rem] w-full rounded-full bg-slate-900 px-4 text-sm font-bold text-paper transition-colors duration-150 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
