import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { getDashboardSummary } from '../../lib/mockData'
import { CATEGORY_LABELS } from '../../lib/types'
import KpiCard from './components/KpiCard'
import { computeKpis } from './dashboardUtils'

/** Decorative heartbeat glyph for the page eyebrow (the PulsoVecinal mark). */
function PulseMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12h4l3-8 4 16 3-8h6" />
    </svg>
  )
}

type SummaryBadgeProps = {
  icon: string
  children: ReactNode
}

/** Small stat pill of the live summary row under the heading. */
function SummaryBadge({ icon, children }: SummaryBadgeProps) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
      <span aria-hidden="true" className="text-xs">
        {icon}
      </span>
      <span className="text-slate-500">{children}</span>
    </li>
  )
}

/**
 * /dashboard page: criticality dashboard of Valledupar barrios.
 * Owns the selected-comuna state and derives every view model through the
 * pure helpers: getDashboardSummary -> computeKpis / buildRanking /
 * categoryDistribution / severityDistribution -> presentational components.
 */
export default function DashboardPage() {
  const summary = useMemo(() => getDashboardSummary(), [])
  const kpis = useMemo(() => computeKpis(summary), [summary])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
        <PulseMark />
        PulsoVecinal · Valledupar
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Dashboard de criticidad
      </h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-500">
        Priorización de necesidades barriales — Valledupar
      </p>

      <ul aria-label="Resumen del dashboard" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <SummaryBadge icon="📅">
          Periodo: {summary.period.start.slice(0, 10)} → {summary.period.end.slice(0, 10)}
        </SummaryBadge>
        <SummaryBadge icon="🧭">Comuna activa: todas</SummaryBadge>
      </ul>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon="📊" label="Reportes totales" value={String(kpis.totalResponses)} />
        <KpiCard icon="📍" label="Barrios cubiertos" value={String(kpis.barriosCubiertos)} />
        <KpiCard
          icon="🏷️"
          label="Categoría más reportada"
          value={`${CATEGORY_LABELS[kpis.topCategory]} (${kpis.topCategoryCount})`}
        />
        <KpiCard icon="🚨" label="Reportes críticos" value={String(kpis.criticalCount)} tone="red" />
      </div>
    </section>
  )
}