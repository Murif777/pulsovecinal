import { CATEGORY_LABELS } from '../../../lib/types'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../dashboardUtils'
import type { ReportRow } from '../reportUtils'

function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

type ReportDetailProps = {
  row: ReportRow | null
  onViewBarrio: (barrio: string) => void
}

/**
 * Side panel with the full text of the selected report. Empty until the
 * analyst picks a row from the table.
 */
export default function ReportDetail({ row, onViewBarrio }: ReportDetailProps) {
  if (row === null) {
    return (
      <aside
        aria-label="Detalle del reporte"
        className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500"
      >
        Selecciona un reporte de la tabla para ver su descripción completa.
      </aside>
    )
  }

  return (
    <aside aria-label="Detalle del reporte" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Reporte específico</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">{row.barrio}</h2>
      <p className="text-sm text-slate-500">{row.comuna}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Categoría</dt>
          <dd className="font-medium text-slate-900">{CATEGORY_LABELS[row.category]}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Severidad</dt>
          <dd>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: SEVERITY_COLORS[row.severity] }}
            >
              {SEVERITY_LABELS[row.severity]}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Fecha</dt>
          <dd className="font-medium tabular-nums text-slate-900">{formatDay(row.date)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Origen</dt>
          <dd className="font-medium text-slate-900">{row.source === 'ciudadano' ? 'Ciudadano' : 'Mock'}</dd>
        </div>
        {row.encuestador !== undefined && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Encuestador</dt>
            <dd className="font-medium text-slate-900">{row.encuestador}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <p className="text-xs text-slate-500">Descripción</p>
        <p className="mt-1 text-sm leading-6 text-slate-800">
          {row.description.length > 0 ? row.description : 'Sin descripción.'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onViewBarrio(row.barrio)}
        className="mt-5 inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        Ver todos los reportes de este barrio
      </button>
    </aside>
  )
}
