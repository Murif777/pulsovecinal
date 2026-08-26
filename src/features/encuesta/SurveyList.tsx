import { useEffect, useState } from 'react'
import { CATEGORY_LABELS } from '../../lib/types'
import type { Severity, SurveyResponse } from '../../lib/types'
import { SEVERITY_LABELS } from './labels'

type SurveyListProps = {
  responses: readonly SurveyResponse[]
}

const SEVERITY_CHIP: Readonly<Record<Severity, string>> = {
  baja: 'bg-slate-100 text-slate-700',
  media: 'bg-amber-50 text-amber-800',
  alta: 'bg-orange-50 text-orange-800',
  critica: 'bg-red-50 text-red-800',
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

type DetailDialogProps = {
  report: SurveyResponse | null
  onClose: () => void
}

function SurveyDetailDialog({ report, onClose }: DetailDialogProps) {
  useEffect(() => {
    if (!report) {
      return
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [report, onClose])

  if (!report) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-detail-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="survey-detail-title" className="text-lg font-semibold text-slate-900">
            Detalle del reporte
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Cerrar
          </button>
        </div>

        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Barrio</dt>
            <dd className="mt-1 break-words font-semibold text-slate-900">{report.barrio}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Comuna</dt>
            <dd className="mt-1 text-slate-800">{report.comuna}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Categoría</dt>
            <dd className="mt-1 text-slate-800">{CATEGORY_LABELS[report.category]}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Urgencia</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CHIP[report.severity]}`}
              >
                {SEVERITY_LABELS[report.severity]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Fecha</dt>
            <dd className="mt-1 text-slate-800">
              <time dateTime={report.date}>{formatDate(report.date)}</time>
            </dd>
          </div>
          {report.description ? (
            <div className="min-w-0">
              <dt className="font-medium text-slate-500">Descripción</dt>
              <dd className="mt-1 max-w-full whitespace-pre-wrap break-all text-slate-800">
                {report.description}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  )
}

/** Compact listing of citizen reports; full text opens in a detail dialog. */
export default function SurveyList({ responses }: SurveyListProps) {
  const items = sortNewestFirst(responses)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null

  return (
    <section
      aria-labelledby="survey-list-heading"
      className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="survey-list-heading" className="text-lg font-semibold text-slate-900">
            Tus reportes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Resumen en esta lista. Usa el ojo para ver el detalle completo.
          </p>
        </div>
        {items.length > 0 ? (
          <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
            {items.length}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Aún no has enviado reportes. Completa el formulario para registrar una necesidad de tu barrio.
        </p>
      ) : (
        <ul className="mt-6 min-w-0 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate font-semibold text-slate-900">{item.barrio}</p>
                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                  <span className="truncate">{item.comuna}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{CATEGORY_LABELS[item.category]}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CHIP[item.severity]}`}
                  >
                    {SEVERITY_LABELS[item.severity]}
                  </span>
                </p>
                <time dateTime={item.date} className="mt-1 block text-xs text-slate-500">
                  {formatDate(item.date)}
                </time>
              </div>
              <button
                type="button"
                aria-label={`Ver detalles del reporte en ${item.barrio}`}
                onClick={() => setSelectedId(item.id)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                <EyeIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SurveyDetailDialog report={selected} onClose={() => setSelectedId(null)} />
    </section>
  )
}
