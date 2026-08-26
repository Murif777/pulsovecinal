import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../trendUtils'

type TrendChartProps = {
  data: readonly TrendPoint[]
}

/**
 * Area chart of reports per day, with the crítica series overlaid in red.
 */
export default function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={[...data]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value: string) => value.slice(5)} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip
          labelFormatter={(label) => `Día ${label}`}
          formatter={(value, name) => [`${value} reportes`, name === 'critical' ? 'Críticos' : 'Reportes']}
        />
        <Legend formatter={(value) => (value === 'critical' ? 'Críticos' : 'Reportes')} />
        <Area type="monotone" dataKey="count" name="count" stroke="#0f766e" fill="#5eead4" fillOpacity={0.45} />
        <Area type="monotone" dataKey="critical" name="critical" stroke="#dc2626" fill="#fca5a5" fillOpacity={0.55} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
