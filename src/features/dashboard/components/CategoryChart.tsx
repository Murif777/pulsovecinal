import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CategoryDistributionEntry } from '../dashboardUtils'

type CategoryChartProps = {
  data: readonly CategoryDistributionEntry[]
}

/**
 * Bar chart of the report distribution across the six complaint categories.
 * Spanish labels come from CATEGORY_LABELS via the pure helper; the tooltip
 * formats the count as "N reportes".
 */
export default function CategoryChart({ data }: CategoryChartProps) {
  const maxCount = Math.max(0, ...data.map((entry) => entry.count))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={[...data]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#e3ded0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#757062' }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#757062' }} />
        <Tooltip formatter={(value) => [`${value} reportes`, 'Reportes']} />
        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.count === maxCount ? '#e8553d' : '#243f7a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}