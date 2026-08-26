import { CATEGORY_LABELS } from '../../lib/types'
import type { SurveyResponse } from '../../lib/types'
import { SEVERITY_LABELS } from './labels'

type SurveyListProps = {
  responses: readonly SurveyResponse[]
}

function formatDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return iso
  }
  return parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function sortNewestFirst(responses: readonly SurveyResponse[]): SurveyResponse[] {
  return [...responses].sort((a, b) => b.date.localeCompare(a.date))
}

/** Local listing of citizen reports stored in this browser. Newest first. */
export default function SurveyList({ responses }: SurveyListProps) {
  const items = sortNewestFirst(responses)

  return (
    <section aria-labelledby="survey-list-heading" className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 id="survey-list-heading" className="text-lg font-semibold text-slate-900">
        Tus reportes
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Se guardan en este navegador. El mapa y el dashboard no los muestran todavía.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Aún no has enviado reportes. Completa el formulario para registrar una necesidad de tu barrio.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">{item.barrio}</p>
              <p className="mt-1 text-sm text-slate-600">
                {item.comuna}
                {' · '}
                {CATEGORY_LABELS[item.category]}
                {' · '}
                {SEVERITY_LABELS[item.severity]}
              </p>
              {item.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p>
              ) : null}
              <time dateTime={item.date} className="mt-2 block text-xs text-slate-500">
                {formatDate(item.date)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
