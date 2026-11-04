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
 * Severity legend floating over the bottom-left of the map: a dark compact
 * strip so it reads over the light basemap. z-[1000] sits above Leaflet panes.
 */
export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl bg-brand-950/90 px-4 py-3 text-paper shadow-lift backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/70">
        Nivel de severidad
      </p>
      <ul className="mt-2 flex items-center gap-4">
        {ALL_SEVERITIES.map((severity) => (
          <li key={severity} className="flex items-center gap-1.5 text-xs font-semibold">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: severityColor(severity) }}
            />
            {SEVERITY_LEGEND_LABELS[severity]}
          </li>
        ))}
      </ul>
    </div>
  )
}
