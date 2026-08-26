import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={[...data]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip formatter={(value) => [`${value} reportes`, 'Reportes']} />
        <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}