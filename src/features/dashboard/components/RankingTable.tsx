import { CATEGORY_LABELS } from '../../../lib/types'
import type { RankingRow } from '../dashboardUtils'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../dashboardUtils'

type RankingTableProps = {
  rows: readonly RankingRow[]
}

/**
 * Presentational ranking of the most critical barrios, ordered by weighted
 * score. The top row is highlighted and each barrio carries a severity badge
 * tinted with the traffic-light color of its maximum severity.
 */
export default function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              #
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Barrio
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Comuna
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Reportes
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Categoría principal
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.barrio}
              className={index === 0 ? 'bg-teal-50/50' : 'border-t border-slate-100'}
            >
              <td className="px-4 py-3 text-slate-500">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-900">
                <span className="inline-flex items-center gap-2">
                  {row.barrio}
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
              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                {row.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}