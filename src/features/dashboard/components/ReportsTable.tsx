import { CATEGORY_LABELS } from '../../../lib/types'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../dashboardUtils'
import type { PageResult, ReportRow, ReportSort, ReportSortKey, SortDirection } from '../reportUtils'

function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

const SOURCE_LABEL = {
  mock: 'Mock',
  ciudadano: 'Ciudadano',
} as const

type Column = {
  key: ReportSortKey
  label: string
}

const COLUMNS: readonly Column[] = [
  { key: 'date', label: 'Fecha' },
  { key: 'barrio', label: 'Barrio' },
  { key: 'category', label: 'Categoría' },
  { key: 'severity', label: 'Severidad' },
]

function ariaSort(sort: ReportSort, key: ReportSortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) {
    return 'none'
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

function nextDirection(sort: ReportSort, key: ReportSortKey): SortDirection {
  if (sort.key !== key) {
    return key === 'date' || key === 'severity' ? 'desc' : 'asc'
  }
  return sort.direction === 'asc' ? 'desc' : 'asc'
}

type ReportsTableProps = {
  page: PageResult<ReportRow>
  sort: ReportSort
  selectedId: string | null
  onSortChange: (sort: ReportSort) => void
  onSelect: (id: string) => void
  onPageChange: (page: number) => void
}

/**
 * Sortable, paginated table of individual survey reports. The selected row
 * is highlighted; clicking a row opens its detail panel.
 */
export default function ReportsTable({
  page,
  sort,
  selectedId,
  onSortChange,
  onSelect,
  onPageChange,
}: ReportsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={ariaSort(sort, column.key)}
                className="px-4 py-3 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => onSortChange({ key: column.key, direction: nextDirection(sort, column.key) })}
                  className="inline-flex items-center gap-1 rounded-md hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                >
                  {column.label}
                  {sort.key === column.key && (
                    <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
            ))}
            <th scope="col" className="px-4 py-3 font-semibold">
              Origen
            </th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((row) => {
            const selected = row.id === selectedId
            return (
              <tr
                key={row.id}
                className={`cursor-pointer border-t border-slate-100 ${selected ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                onClick={() => onSelect(row.id)}
              >
                <td className="px-4 py-3 tabular-nums text-slate-500">{formatDay(row.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.barrio}</td>
                <td className="px-4 py-3 text-slate-700">{CATEGORY_LABELS[row.category]}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: SEVERITY_COLORS[row.severity] }}
                  >
                    {SEVERITY_LABELS[row.severity]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.source === 'ciudadano'
                        ? 'rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700'
                        : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600'
                    }
                  >
                    {SOURCE_LABEL[row.source]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
        <p>
          {page.total === 0
            ? 'Sin reportes'
            : `${page.total} ${page.total === 1 ? 'reporte' : 'reportes'} · página ${page.page} de ${page.totalPages}`}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={page.page <= 1}
            onClick={() => onPageChange(page.page - 1)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page.page >= page.totalPages}
            onClick={() => onPageChange(page.page + 1)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
