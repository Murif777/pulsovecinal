import { CATEGORY_LABELS } from '../../../lib/types'
import type { RankingRow } from '../dashboardUtils'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../dashboardUtils'
import type { RankingSort, RankingSortKey, SortDirection } from '../reportUtils'

type RankingTableProps = {
  rows: readonly RankingRow[]
  /** Current ranking sort; omit to keep the original static headers. */
  sort?: RankingSort
  onSortChange?: (sort: RankingSort) => void
  /** When set, barrio names become drill-down buttons. */
  onSelectBarrio?: (barrio: string) => void
}

function ariaSort(sort: RankingSort | undefined, key: RankingSortKey): 'ascending' | 'descending' | 'none' | undefined {
  if (sort === undefined) {
    return undefined
  }
  if (sort.key !== key) {
    return 'none'
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

function nextDirection(sort: RankingSort, key: RankingSortKey): SortDirection {
  if (sort.key !== key) {
    return key === 'barrio' ? 'asc' : 'desc'
  }
  return sort.direction === 'asc' ? 'desc' : 'asc'
}

type SortableHeaderProps = {
  label: string
  sortKey: RankingSortKey
  sort?: RankingSort
  onSortChange?: (sort: RankingSort) => void
  align?: 'left' | 'right'
}

function SortableHeader({ label, sortKey, sort, onSortChange, align = 'left' }: SortableHeaderProps) {
  const alignClass = align === 'right' ? 'text-right' : ''
  if (sort === undefined || onSortChange === undefined) {
    return (
      <th scope="col" className={`px-4 py-3 font-semibold ${alignClass}`}>
        {label}
      </th>
    )
  }
  return (
    <th scope="col" aria-sort={ariaSort(sort, sortKey)} className={`px-4 py-3 font-semibold ${alignClass}`}>
      <button
        type="button"
        onClick={() => onSortChange({ key: sortKey, direction: nextDirection(sort, sortKey) })}
        className="inline-flex items-center gap-1 rounded-md hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        {label}
        {sort.key === sortKey && <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}

/**
 * Presentational ranking of the most critical barrios, ordered by weighted
 * score. The top row is highlighted and each barrio carries a severity badge
 * tinted with the traffic-light color of its maximum severity.
 */
export default function RankingTable({ rows, sort, onSortChange, onSelectBarrio }: RankingTableProps) {
  const maxScore = Math.max(1, ...rows.map((row) => row.score))
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-100/60 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              #
            </th>
            <SortableHeader label="Barrio" sortKey="barrio" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className="px-4 py-3 font-semibold">
              Comuna
            </th>
            <SortableHeader label="Reportes" sortKey="totalCount" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className="px-4 py-3 font-semibold">
              Categoría principal
            </th>
            <SortableHeader label="Score" sortKey="score" sort={sort} onSortChange={onSortChange} align="right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.barrio}
              className={index === 0 ? 'bg-pulse-500/[0.06]' : 'border-t border-slate-100'}
            >
              <td className="px-4 py-3 text-slate-500">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-900">
                <span className="inline-flex items-center gap-2">
                  {onSelectBarrio ? (
                    <button
                      type="button"
                      onClick={() => onSelectBarrio(row.barrio)}
                      className="rounded-md text-left text-teal-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                    >
                      {row.barrio}
                    </button>
                  ) : (
                    row.barrio
                  )}
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: SEVERITY_COLORS[row.maxSeverity] }}
                  >
                    {SEVERITY_LABELS[row.maxSeverity]}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{row.comuna}</td>
              <td className="px-4 py-3 tabular-nums text-slate-700">{row.totalCount}</td>
              <td className="px-4 py-3 text-slate-700">{CATEGORY_LABELS[row.topCategory]}</td>
              <td className="px-4 py-3">
                <span className="flex items-center justify-end gap-3">
                  <span
                    aria-hidden="true"
                    className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 sm:block"
                  >
                    <span
                      className="block h-full rounded-full bg-pulse-500"
                      style={{ width: `${Math.round((row.score / maxScore) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 text-right font-display text-lg font-bold tabular-nums text-slate-900">
                    {row.score}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
