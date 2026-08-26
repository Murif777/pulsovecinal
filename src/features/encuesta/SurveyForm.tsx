import { useState, type FormEvent } from 'react'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../../lib/types'
import type { ComplaintCategory, Severity } from '../../lib/types'
import { BARRIOS } from './barrios'
import { SEVERITY_LABELS } from './labels'

export type SurveyFormValues = {
  barrio: string
  category: ComplaintCategory
  severity: Severity
  description: string
}

type SurveyFormProps = {
  onSubmitted: (values: SurveyFormValues) => void
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
  step,
  children,
}: {
  htmlFor: string
  step: string
  children: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="font-mono text-xs font-medium text-teal-700">
        {step}
      </span>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
        {children}
      </label>
    </div>
  )
}

/** Citizen survey form: barrio, category, urgency and description are all required. */
export default function SurveyForm({ onSubmitted }: SurveyFormProps) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onSubmitted({
      barrio: values.barrio,
      category: values.category as ComplaintCategory,
      severity: values.severity as Severity,
      description: values.description.trim(),
    })
    setValues(EMPTY_FORM)
    setErrors({})
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="encuesta-heading"
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Reportar una necesidad</h2>
        <p className="mt-1 text-sm text-slate-600">
          Completa los cuatro campos para registrar el problema de tu barrio.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <FieldLabel htmlFor="survey-barrio" step="01">
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
            onChange={(event) => setValues((current) => ({ ...current, barrio: event.target.value }))}
          >
            <option value="">Selecciona un barrio</option>
            {BARRIOS.map((barrio) => (
              <option key={barrio.name} value={barrio.name}>
                {barrio.name}
              </option>
            ))}
          </select>
          {errors.barrio ? (
            <p id="survey-barrio-error" role="alert" className="mt-1.5 text-sm text-red-700">
              {errors.barrio}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="survey-category" step="02">
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
            <FieldLabel htmlFor="survey-severity" step="03">
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
          <FieldLabel htmlFor="survey-description" step="04">
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
          className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Enviar reporte
        </button>
      </div>
    </form>
  )
}
