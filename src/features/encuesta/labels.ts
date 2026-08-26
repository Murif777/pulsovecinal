import type { Severity } from '../../lib/types'

/** Spanish display label for each urgency level (UI never renders raw union values). */
export const SEVERITY_LABELS: Readonly<Record<Severity, string>> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}
