import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { SeverityDistributionEntry } from '../dashboardUtils'

type SeverityChartProps = {
  data: readonly SeverityDistributionEntry[]
}

/**
 * Donut chart of the report distribution across the four severity levels.
 * Each segment is tinted with its traffic-light color and the legend shows
 * "Label — count" (e.g. "Crítica — 2").
 */
export default function SeverityChart({ data }: SeverityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={[...data]}
          dataKey="count"
          nameKey="label"
          innerRadius={62}
          outerRadius={88}
          paddingAngle={2}
          stroke="#ffffff" strokeWidth={3}
        >
          {data.map((entry) => (
            <Cell key={entry.severity} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} reportes`, name]} />
        <Legend formatter={(value, _entry, index) => `${value} — ${data[index]?.count ?? ''}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}