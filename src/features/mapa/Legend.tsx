import type { Severity } from '../../lib/types'
import { ALL_SEVERITIES } from '../../lib/types'
import { severityColor } from './mapUtils'

/** Spanish display label for each severity (UI never renders raw union values). */
const SEVERITY_LEGEND_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

/**
 * Severity color legend overlaid on the bottom-right of the map, styled as a
 * compact frosted-glass card.
 * z-[1000] sits above Leaflet's panes (~700) so it stays visible.
 */
export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-white/60 bg-white/85 p-3.5 shadow-lg shadow-slate-900/10 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Nivel de severidad
      </p>
      <ul className="mt-2 space-y-1.5">
        {ALL_SEVERITIES.map((severity) => (
          <li key={severity} className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white/80"
              style={{ backgroundColor: severityColor(severity) }}
            />
            {SEVERITY_LEGEND_LABELS[severity]}
          </li>
        ))}
      </ul>
    </div>
  )
}
