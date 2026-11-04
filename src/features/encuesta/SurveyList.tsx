import { useEffect, useState } from 'react'
import { CATEGORY_LABELS } from '../../lib/types'
import type { Severity, SurveyResponse } from '../../lib/types'
import { SEVERITY_LABELS } from './labels'

type SurveyListProps = {
  responses: readonly SurveyResponse[]
}

const SEVERITY_CHIP: Readonly<Record<Severity, string>> = {
  baja: 'bg-slate-50 text-slate-600',
  media: 'bg-amber-50 text-amber-800',
  alta: 'bg-orange-50 text-orange-800',
  critica: 'bg-rose-50 text-rose-800',
}

const SEVERITY_BAR: Readonly<Record<Severity, string>> = {
  baja: 'border-l-slate-300',
  media: 'border-l-amber-300',
  alta: 'border-l-orange-300',
  critica: 'border-l-rose-300',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-detail-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="survey-detail-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Detalle del reporte
              </h2>
              <p className="mt-1 text-sm text-slate-600">Consulta la ficha completa de este reporte</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
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
            <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</dt>
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

/** Reports rendered per "Mostrar más" step; keeps the DOM small with thousands of rows. */
const PAGE_SIZE = 12

/** Compact listing of citizen reports; full text opens in a detail dialog. */
export default function SurveyList({ responses }: SurveyListProps) {
  const items = sortNewestFirst(responses)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const selected = items.find((item) => item.id === selectedId) ?? null

  return (
    <section
      aria-labelledby="survey-list-heading"
      className="flex max-h-[min(46rem,calc(100dvh-7rem))] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div className="min-w-0">
          <h2 id="survey-list-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Tus reportes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Resumen en esta lista. Usa el ojo para ver el detalle completo.
          </p>
        </div>
        {items.length > 0 ? (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {items.length}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700 ring-1 ring-slate-200">
              <ClipboardIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Aún no has enviado reportes. Completa el formulario para registrar una necesidad de tu barrio.
            </p>
          </div>
        ) : (
          <ul aria-label="Tus reportes" className="min-w-0 space-y-3">
            {items.slice(0, visibleCount).map((item) => (
              <li
                key={item.id}
                className={`flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 border-l-4 bg-slate-50/60 px-3 py-3 transition hover:bg-white ${SEVERITY_BAR[item.severity]}`}
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate font-bold text-slate-900">{item.barrio}</p>
                  <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="truncate">{item.comuna}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
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
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-teal-700 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > visibleCount ? (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Mostrar más ({items.length - visibleCount} restantes)
          </button>
        ) : null}
      </div>

      <SurveyDetailDialog report={selected} onClose={() => setSelectedId(null)} />
    </section>
  )
}
