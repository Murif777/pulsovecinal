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
        <CartesianGrid strokeDasharray="3 3" stroke="#e3ded0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#757062' }} tickFormatter={(value: string) => value.slice(5)} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#757062' }} />
        <Tooltip
          labelFormatter={(label) => `Día ${label}`}
          formatter={(value, name) => [`${value} reportes`, name === 'critical' ? 'Críticos' : 'Reportes']}
        />
        <Legend formatter={(value) => (value === 'critical' ? 'Críticos' : 'Reportes')} />
        <Area type="monotone" dataKey="count" name="count" stroke="#243f7a" strokeWidth={2.5} fill="#84a8de" fillOpacity={0.35} />
        <Area type="monotone" dataKey="critical" name="critical" stroke="#e8553d" strokeWidth={2.5} fill="#f07a63" fillOpacity={0.4} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
