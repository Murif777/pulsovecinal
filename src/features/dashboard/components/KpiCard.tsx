type KpiCardProps = {
  /** Decorative emoji glyph, rendered with aria-hidden. */
  icon: string
  label: string
  value: string
  /** Red accent for the criticality card; teal for the rest. */
  tone?: 'teal' | 'red'
}

/**
 * Presentational KPI card: icon in a tinted square, label and a big
 * tabular-nums value. The criticality card uses the red accent.
 */
export default function KpiCard({ icon, label, value, tone = 'teal' }: KpiCardProps) {
  const iconBox = tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${iconBox}`}
        >
          {icon}
        </span>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}