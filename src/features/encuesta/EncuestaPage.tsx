import { useState } from 'react'
import SurveyForm from './SurveyForm'
import type { SurveyFormValues } from './SurveyForm'
import SurveyList from './SurveyList'
import { appendSurveyResponse, createSurveyResponse, loadSurveyResponses } from './storage'

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
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 id="encuesta-heading" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Encuestas
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        Reporta una necesidad de tu barrio: elige la zona, la categoría del problema, qué tan urgente es y
        descríbelo. Tus respuestas quedan en este dispositivo para que puedas revisarlas.
      </p>

      {status === 'saved' ? (
        <p
          role="status"
          className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
        >
          Tu reporte se guardó correctamente.
        </p>
      ) : null}
      {status === 'error' ? (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo guardar el reporte. Intenta de nuevo.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <SurveyForm onSubmitted={handleSubmitted} />
        <SurveyList responses={responses} />
      </div>
    </section>
  )
}
