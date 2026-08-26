import { useEffect, useState } from 'react'
import { CATEGORY_LABELS } from '../../lib/types'
import type { Severity, SurveyResponse } from '../../lib/types'
import { SEVERITY_LABELS } from './labels'

type SurveyListProps = {
  responses: readonly SurveyResponse[]
}

const SEVERITY_CHIP: Readonly<Record<Severity, string>> = {
  baja: 'bg-slate-100 text-slate-700',
  media: 'bg-amber-100 text-amber-900',
  alta: 'bg-orange-100 text-orange-900',
  critica: 'bg-red-100 text-red-800',
}

const SEVERITY_BAR: Readonly<Record<Severity, string>> = {
  baja: 'border-l-slate-400',
  media: 'border-l-amber-400',
  alta: 'border-l-orange-500',
  critica: 'border-l-red-500',
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

function ClipboardIcon({ className }: { className?: string }) {
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
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-detail-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-teal-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="survey-detail-title" className="text-lg font-bold tracking-tight">
                Detalle del reporte
              </h2>
              <p className="mt-1 text-sm text-teal-100">Consulta la ficha completa de este reporte</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Cerrar
            </button>
          </div>
        </div>

        <dl className="grid gap-3 p-6 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Barrio</dt>
            <dd className="mt-1 break-words font-semibold text-slate-900">{report.barrio}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comuna</dt>
            <dd className="mt-1 text-slate-800">{report.comuna}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</dt>
            <dd className="mt-1 text-slate-800">{CATEGORY_LABELS[report.category]}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Urgencia</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[report.severity]}`}
              >
                {SEVERITY_LABELS[report.severity]}
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</dt>
            <dd className="mt-1 text-slate-800">
              <time dateTime={report.date}>{formatDate(report.date)}</time>
            </dd>
          </div>
          {report.description ? (
            <div className="min-w-0 rounded-xl bg-teal-50 px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-teal-800">Descripción</dt>
              <dd className="mt-2 max-w-full whitespace-pre-wrap break-all text-sm leading-6 text-slate-800">
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
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="flex items-start justify-between gap-3 bg-slate-900 px-6 py-5 text-white">
        <div className="min-w-0">
          <h2 id="survey-list-heading" className="text-lg font-bold tracking-tight">
            Tus reportes
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Resumen en esta lista. Usa el ojo para ver el detalle completo.
          </p>
        </div>
        {items.length > 0 ? (
          <span className="shrink-0 rounded-full bg-teal-500 px-2.5 py-1 text-xs font-bold text-white">
            {items.length}
          </span>
        ) : null}
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <ClipboardIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Aún no has enviado reportes. Completa el formulario para registrar una necesidad de tu barrio.
            </p>
          </div>
        ) : (
          <ul aria-label="Tus reportes" className="min-w-0 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 border-l-4 bg-white px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40 ${SEVERITY_BAR[item.severity]}`}
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate font-bold text-slate-900">{item.barrio}</p>
                  <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="truncate">{item.comuna}</span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[item.severity]}`}
                    >
                      {SEVERITY_LABELS[item.severity]}
                    </span>
                  </p>
                  <time dateTime={item.date} className="mt-1.5 block text-xs text-slate-500">
                    {formatDate(item.date)}
                  </time>
                </div>
                <button
                  type="button"
                  aria-label={`Ver detalles del reporte en ${item.barrio}`}
                  onClick={() => setSelectedId(item.id)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SurveyDetailDialog report={selected} onClose={() => setSelectedId(null)} />
    </section>
  )
}
