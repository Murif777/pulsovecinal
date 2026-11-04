import { useState, type FormEvent } from 'react'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../lib/types'
import type { ComplaintCategory, Severity } from '../../lib/types'
import type { BarrioInfo } from '../../lib/api'
import { SEVERITY_LABELS } from './labels'
import LocationField from './LocationField'
import type { CapturedLocation } from './geo'

export type SurveyFormValues = {
  barrio: string
  category: ComplaintCategory
  severity: Severity
  description: string
  /** Optional GPS fix; omitted when the citizen did not add one. */
  location?: CapturedLocation
}

type SurveyFormProps = {
  /** Barrio registry from GET /api/barrios; null while it is loading. */
  barrios: readonly BarrioInfo[] | null
  barriosError: boolean
  onRetryBarrios: () => void
  submitting: boolean
  /** Resolves true when the report was persisted by the API. */
  onSubmitted: (values: SurveyFormValues) => Promise<boolean>
}

type FieldName = 'barrio' | 'category' | 'severity' | 'description'
type FieldErrors = Partial<Record<FieldName, string>>

const EMPTY_FORM = {
  barrio: '',
  category: '',
  severity: '',
  description: '',
}

const fieldClassName =
  'mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30'

function errorClassName(hasError: boolean) {
  return hasError
    ? `${fieldClassName} border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/30`
    : fieldClassName
}

function validate(values: typeof EMPTY_FORM): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.barrio) {
    errors.barrio = 'Selecciona un barrio'
  }
  if (!values.category) {
    errors.category = 'Selecciona una categoría'
  }
  if (!values.severity) {
    errors.severity = 'Selecciona un nivel de urgencia'
  }
  if (!values.description.trim()) {
    errors.description = 'Describe el problema'
  }
  return errors
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: string
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
        {children}
      </label>
    </div>
  )
}

/** Citizen survey form: barrio, category, urgency and description are all required. */
export default function SurveyForm({
  barrios,
  barriosError,
  onRetryBarrios,
  submitting,
  onSubmitted,
}: SurveyFormProps) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [location, setLocation] = useState<CapturedLocation | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    const saved = await onSubmitted({
      barrio: values.barrio,
      category: values.category as ComplaintCategory,
      severity: values.severity as Severity,
      description: values.description.trim(),
      ...(location !== null ? { location } : {}),
    })
    if (saved) {
      setLocation(null)
      setValues(EMPTY_FORM)
      setErrors({})
    }
  }

  const barriosUnavailable = barrios === null || barriosError

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="encuesta-heading"
      className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift"
    >
      <div className="bg-brand-950 px-6 py-6 text-paper">
        <h2 className="font-display text-2xl font-bold tracking-tight">Reportar una necesidad</h2>
        <p className="mt-1 text-sm text-brand-100/75">
          Completa los cuatro campos para registrar el problema de tu barrio.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <FieldLabel htmlFor="survey-barrio">
            Barrio
          </FieldLabel>
          <select
            id="survey-barrio"
            name="barrio"
            value={values.barrio}
            aria-required="true"
            aria-invalid={Boolean(errors.barrio)}
            aria-describedby={errors.barrio ? 'survey-barrio-error' : undefined}
            className={errorClassName(Boolean(errors.barrio))}
            disabled={barriosUnavailable || submitting}
            onChange={(event) => setValues((current) => ({ ...current, barrio: event.target.value }))}
          >
            <option value="">
              {barrios === null ? 'Cargando barrios…' : 'Selecciona un barrio'}
            </option>
            {barrios === null
              ? null
              : barrios.map((barrio) => (
                  <option key={barrio.nombre} value={barrio.nombre}>
                    {barrio.nombre}
                  </option>
                ))}
          </select>
          {barriosError ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p id="survey-barrios-error" role="alert" className="text-sm text-red-700">
                No se pudieron cargar los barrios.
              </p>
              <button
                type="button"
                onClick={onRetryBarrios}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Reintentar barrios
              </button>
            </div>
          ) : null}
          {errors.barrio ? (
            <p id="survey-barrio-error" role="alert" className="mt-1.5 text-sm text-red-700">
              {errors.barrio}
            </p>
          ) : null}
        </div>

        <LocationField
          value={location}
          onChange={setLocation}
          barrios={barrios}
          selectedBarrio={values.barrio}
          onSuggestBarrio={(nombre) => {
            setValues((current) => ({ ...current, barrio: nombre }))
            setErrors((current) => ({ ...current, barrio: undefined }))
          }}
          disabled={submitting}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="survey-category">
              Categoría
            </FieldLabel>
            <select
              id="survey-category"
              name="category"
              value={values.category}
              aria-required="true"
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'survey-category-error' : undefined}
              className={errorClassName(Boolean(errors.category))}
              disabled={submitting}
              onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Selecciona una categoría</option>
              {ALL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p id="survey-category-error" role="alert" className="mt-1.5 text-sm text-red-700">
                {errors.category}
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="survey-severity">
              Urgencia
            </FieldLabel>
            <select
              id="survey-severity"
              name="severity"
              value={values.severity}
              aria-required="true"
              aria-invalid={Boolean(errors.severity)}
              aria-describedby={errors.severity ? 'survey-severity-error' : undefined}
              className={errorClassName(Boolean(errors.severity))}
              disabled={submitting}
              onChange={(event) => setValues((current) => ({ ...current, severity: event.target.value }))}
            >
              <option value="">Selecciona un nivel de urgencia</option>
              {ALL_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_LABELS[severity]}
                </option>
              ))}
            </select>
            {errors.severity ? (
              <p id="survey-severity-error" role="alert" className="mt-1.5 text-sm text-red-700">
                {errors.severity}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="survey-description">
            Descripción
          </FieldLabel>
          <textarea
            id="survey-description"
            name="description"
            rows={5}
            value={values.description}
            aria-required="true"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'survey-description-error' : undefined}
            className={`${errorClassName(Boolean(errors.description))} max-w-full resize-y break-all`}
            placeholder="Cuéntanos qué ocurre y dónde se presenta el problema."
            disabled={submitting}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />
          {errors.description ? (
            <p id="survey-description-error" role="alert" className="mt-1.5 text-sm text-red-700">
              {errors.description}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={barriosUnavailable || submitting}
          className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-full bg-pulse-600 px-4 text-sm font-bold text-white shadow-card transition hover:bg-pulse-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Enviar reporte
        </button>
      </div>
    </form>
  )
}