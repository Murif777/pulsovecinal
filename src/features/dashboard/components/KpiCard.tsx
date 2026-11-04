import type { ReactNode } from 'react'

type KpiCardProps = {
  /** Decorative icon element. */
  icon: ReactNode
  label: string
  value: string
  /** Coral accent for the criticality card. */
  tone?: 'teal' | 'red'
  /** Optional context line under the value (e.g. "de 20 sin filtros"). */
  hint?: string
}

/**
 * Headline stat for the dark dashboard band: eyebrow label, oversized
 * serif value. Long text values (the top category) drop to a smaller size.
 */
export default function KpiCard({ icon, label, value, tone = 'teal', hint }: KpiCardProps) {
  const isText = Number.isNaN(Number(value))
  const valueColor = tone === 'red' ? 'text-pulse-400' : 'text-paper'

  return (
    <div className="rounded-xl border border-paper/10 bg-paper/[0.05] p-5 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-200/80">
        {icon}
        {label}
      </p>
      <p
        className={`mt-3 font-display font-bold tabular-nums leading-none ${valueColor} ${isText ? 'text-2xl leading-tight' : 'text-5xl'}`}
      >
        {value}
      </p>
      {hint !== undefined && <p className="mt-2 text-xs text-brand-200/60">{hint}</p>}
    </div>
  )
}
