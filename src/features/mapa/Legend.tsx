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
 * Severity color legend overlaid on the bottom-right of the map.
 * z-[1000] sits above Leaflet's panes (~700) so it stays visible.
 */
export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Nivel de severidad
      </p>
      <ul className="mt-2 space-y-1">
        {ALL_SEVERITIES.map((severity) => (
          <li key={severity} className="flex items-center gap-2 text-sm text-slate-700">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: severityColor(severity) }}
            />
            {SEVERITY_LEGEND_LABELS[severity]}
          </li>
        ))}
      </ul>
    </div>
  )
}
