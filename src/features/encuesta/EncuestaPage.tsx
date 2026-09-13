import { useEffect, useState } from 'react'
import { createSurvey, getBarrios, getSurveys } from '../../lib/api'
import type { BarrioInfo } from '../../lib/api'
import type { SurveyResponse } from '../../lib/types'
import SurveyForm from './SurveyForm'
import type { SurveyFormValues } from './SurveyForm'
import SurveyList from './SurveyList'

const STEPS = [
  { n: '01', title: 'Elige el barrio', detail: 'Selecciona tu zona en Valledupar' },
  { n: '02', title: 'Cuenta el problema', detail: 'Categoría, urgencia y descripción' },
  { n: '03', title: 'Revisa tus reportes', detail: 'Ábrelos con el ojo cuando quieras' },
]

/**
 * Citizen survey page: registers a report against the API and lists the
 * responses that exist on the backend (not just this browser).
 */
export default function EncuestaPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listRetryKey, setListRetryKey] = useState(0)

  const [barrios, setBarrios] = useState<BarrioInfo[] | null>(null)
  const [barriosStatus, setBarriosStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [barriosRetryKey, setBarriosRetryKey] = useState(0)

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    setListStatus('loading')
    getSurveys()
      .then((items) => {
        if (cancelled) {
          return
        }
        setResponses(items)
        setListStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setListStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [listRetryKey])

  useEffect(() => {
    let cancelled = false
    setBarriosStatus('loading')
    setBarrios(null)
    getBarrios()
      .then((items) => {
        if (cancelled) {
          return
        }
        setBarrios(items)
        setBarriosStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setBarriosStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [barriosRetryKey])

  /** Registers the report via POST /api/encuestas; refreshes the list on success. */
  async function handleSubmitted(values: SurveyFormValues): Promise<boolean> {
    setStatus('saving')
    try {
      await createSurvey({
        barrio: values.barrio,
        category: values.category,
        severity: values.severity,
        description: values.description.trim(),
      })
      const latest = await getSurveys()
      setResponses(latest)
      setStatus('saved')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }

  return (
    <div className="bg-gradient-to-b from-teal-50/60 to-white">
      <section className="border-b border-slate-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-700">
            Valledupar · reporte ciudadano
          </span>
          <h1 id="encuesta-heading" className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Encuestas
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Reporta una necesidad de tu barrio: elige la zona, la categoría del problema, qué tan urgente es y
            descríbelo. Tus respuestas se registran en la plataforma y quedan a disposición del mapa y del
            dashboard.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="font-mono text-sm font-medium text-teal-700">{step.n}</span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{step.detail}</span>
              </span>
            </div>
          ))}
        </div>

        {status === 'saving' ? (
          <p role="status" className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Guardando tu reporte…
          </p>
        ) : null}
        {status === 'saved' ? (
          <p
            role="status"
            className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900"
          >
            Tu reporte se guardó correctamente.
          </p>
        ) : null}
        {status === 'error' ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            No se pudo guardar el reporte. Intenta de nuevo.
          </p>
        ) : null}

        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0">
            <SurveyForm
              barrios={barrios}
              barriosError={barriosStatus === 'error'}
              onRetryBarrios={() => setBarriosRetryKey((key) => key + 1)}
              submitting={status === 'saving'}
              onSubmitted={handleSubmitted}
            />
          </div>
          <div className="min-w-0">
            {listStatus === 'error' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center">
                <p role="alert" className="text-sm text-red-800">
                  No se pudieron cargar tus reportes.
                </p>
                <button
                  type="button"
                  onClick={() => setListRetryKey((key) => key + 1)}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Reintentar reportes
                </button>
              </div>
            ) : listStatus === 'loading' ? (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                Cargando tus reportes…
              </p>
            ) : (
              <SurveyList responses={responses} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}