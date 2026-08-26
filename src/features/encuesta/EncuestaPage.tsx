import { useState } from 'react'
import SurveyForm from './SurveyForm'
import type { SurveyFormValues } from './SurveyForm'
import SurveyList from './SurveyList'
import { appendSurveyResponse, createSurveyResponse, loadSurveyResponses } from './storage'

const STEPS = [
  { n: '01', title: 'Elige el barrio', detail: 'Selecciona tu zona en Valledupar' },
  { n: '02', title: 'Cuenta el problema', detail: 'Categoría, urgencia y descripción' },
  { n: '03', title: 'Revisa tus reportes', detail: 'Ábrelos con el ojo cuando quieras' },
]

/** Citizen survey page: capture a report locally and list previous ones from this browser. */
export default function EncuestaPage() {
  const [responses, setResponses] = useState(loadSurveyResponses)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  function handleSubmitted(values: SurveyFormValues) {
    try {
      const next = appendSurveyResponse(createSurveyResponse(values))
      setResponses(next)
      setStatus('saved')
    } catch {
      setStatus('error')
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
            descríbelo. Tus respuestas quedan en este dispositivo para que puedas revisarlas.
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
            <SurveyForm onSubmitted={handleSubmitted} />
          </div>
          <div className="min-w-0">
            <SurveyList responses={responses} />
          </div>
        </div>
      </section>
    </div>
  )
}
