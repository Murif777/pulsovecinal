import { Icon } from '../../components/Icon'
import { LEGAL_VERSION } from '../legal/legalConfig'
import type { IconName } from '../../components/Icon'
import { useEffect, useState } from 'react'
import { ApiError, createSurvey, getBarrios, getSurveys } from '../../lib/api'
import type { BarrioInfo } from '../../lib/api'
import type { SurveyResponse } from '../../lib/types'
import SurveyForm from './SurveyForm'
import type { SurveyFormValues } from './SurveyForm'
import SurveyList from './SurveyList'

const STEPS: readonly { icon: IconName; title: string; detail: string }[] = [
  { icon: 'pin', title: 'Elige el barrio', detail: 'Selecciona tu zona en Valledupar' },
  { icon: 'pen', title: 'Cuenta el problema', detail: 'Categoría, urgencia y descripción' },
  { icon: 'eye', title: 'Revisa tus reportes', detail: 'Ábrelos con el ojo cuando quieras' },
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
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

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
        ...(values.location !== undefined
          ? {
              lat: values.location.lat,
              lng: values.location.lng,
              accuracy: values.location.accuracy,
              consent: true,
              consent_version: LEGAL_VERSION,
            }
          : {}),
      })
      const latest = await getSurveys()
      setResponses(latest)
      setStatus('saved')
      return true
    } catch (error) {
      setErrorDetail(error instanceof ApiError && error.status === 429 ? error.message : null)
      setStatus('error')
      return false
    }
  }

  return (
    <div>
      <section className="border-b border-slate-200">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <h1
              id="encuesta-heading"
              className="text-6xl font-bold leading-[0.95] text-slate-900 sm:text-7xl lg:text-8xl"
            >
              Participa
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Reporta una necesidad de tu barrio: elige la zona, la categoría del problema, qué tan urgente es y
              descríbelo. Tus respuestas se registran en la plataforma y quedan a disposición del mapa y del
              dashboard.
            </p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-300">
            {STEPS.map((step) => (
              <div key={step.title} className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-pulse-400">
                  <Icon name={step.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{step.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{step.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {status === 'saving' ? (
          <p role="status" className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900">
            Guardando tu reporte…
          </p>
        ) : null}
        {status === 'saved' ? (
          <p
            role="status"
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900"
          >
            Tu reporte se guardó correctamente.
          </p>
        ) : null}
        {status === 'error' ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-pulse-500/30 bg-pulse-500/5 px-4 py-3 text-sm font-semibold text-pulse-600"
          >
            {errorDetail ?? 'No se pudo guardar el reporte. Intenta de nuevo.'}
          </p>
        ) : null}

        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
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