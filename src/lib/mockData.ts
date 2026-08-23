import type {
  ComplaintCategory,
  CriticalBarrio,
  DashboardSummary,
  MapReport,
  Severity,
  SummaryPeriod,
  SurveyResponse,
} from './types'
import { ALL_CATEGORIES, SEVERITY_WEIGHTS } from './types'

/**
 * Registry of real Valledupar neighborhoods with plausible coordinates
 * around the city center (~10.46, -73.25). Single source of truth for the
 * comuna of each barrio: survey responses only reference the barrio name.
 */
const BARRIO_LOCATIONS: Readonly<
  Record<string, { readonly comuna: string; readonly lat: number; readonly lng: number }>
> = {
  'La Esperanza': { comuna: 'Comuna 2', lat: 10.4721, lng: -73.2405 },
  'El Popul': { comuna: 'Comuna 1', lat: 10.4589, lng: -73.2571 },
  'Los Cerros': { comuna: 'Comuna 3', lat: 10.483, lng: -73.2295 },
  'Villa Rosa': { comuna: 'Comuna 2', lat: 10.4655, lng: -73.235 },
  'Bello Horizonte': { comuna: 'Comuna 4', lat: 10.4512, lng: -73.265 },
  'La Paz': { comuna: 'Comuna 3', lat: 10.476, lng: -73.25 },
  Cañaveral: { comuna: 'Comuna 5', lat: 10.443, lng: -73.272 },
  'La Nevada': { comuna: 'Comuna 6', lat: 10.438, lng: -73.238 },
  'Los Cortijos': { comuna: 'Comuna 5', lat: 10.447, lng: -73.28 },
  'El Prado': { comuna: 'Comuna 1', lat: 10.462, lng: -73.262 },
  Dangond: { comuna: 'Comuna 4', lat: 10.455, lng: -73.245 },
  Garupal: { comuna: 'Comuna 6', lat: 10.433, lng: -73.255 },
  'Villa Castilla': { comuna: 'Comuna 4', lat: 10.449, lng: -73.23 },
  '450 Años': { comuna: 'Comuna 2', lat: 10.468, lng: -73.228 },
  Novalito: { comuna: 'Comuna 6', lat: 10.44, lng: -73.265 },
}

/**
 * Local factory that keeps each response's comuna consistent with the registry.
 * Takes the survey record minus `comuna` (derived from the barrio registry).
 */
function response(data: Omit<SurveyResponse, 'comuna'>): SurveyResponse {
  const location = BARRIO_LOCATIONS[data.barrio]
  if (!location) {
    throw new Error(`Barrio sin coordenadas registradas en mockData: "${data.barrio}"`)
  }
  return { ...data, comuna: location.comuna }
}

/**
 * Mock survey responses collected across Valledupar barrios during August 2026.
 * Dates are uniform ISO UTC strings, so lexicographic order equals chronological order.
 */
export const mockSurveyResponses: readonly SurveyResponse[] = [
  response({ id: 'resp-001', barrio: 'La Esperanza', category: 'alcantarillado', severity: 'critica', date: '2026-08-01T14:30:00.000Z', description: 'Alcantarillado rebosando en la carrera 7 con calle 11', encuestador: 'Ana Martínez' }),
  response({ id: 'resp-002', barrio: 'La Esperanza', category: 'seguridad', severity: 'media', date: '2026-08-02T16:05:00.000Z', description: 'Falta alumbrado en el parque y hay hurtos nocturnos', encuestador: 'Ana Martínez' }),
  response({ id: 'resp-003', barrio: 'El Popul', category: 'energia', severity: 'alta', date: '2026-08-03T09:15:00.000Z', description: 'Transformador chisporrotea en la carrera 6', encuestador: 'Carlos Guerra' }),
  response({ id: 'resp-004', barrio: 'El Popul', category: 'energia', severity: 'media', date: '2026-08-04T11:40:00.000Z', description: 'Apagones diarios en la cuadra 18', encuestador: 'Carlos Guerra' }),
  response({ id: 'resp-005', barrio: 'Los Cerros', category: 'vias', severity: 'alta', date: '2026-08-05T08:20:00.000Z', description: 'Vía de acceso destruida por las lluvias', encuestador: 'Laura Ospino' }),
  response({ id: 'resp-006', barrio: 'Villa Rosa', category: 'espacios_publicos', severity: 'baja', date: '2026-08-05T15:50:00.000Z', description: 'Parque infantil requiere pintura y juegos nuevos', encuestador: 'Laura Ospino' }),
  response({ id: 'resp-007', barrio: 'Bello Horizonte', category: 'seguridad', severity: 'alta', date: '2026-08-06T19:10:00.000Z', description: 'Microtráfico frente al colegio', encuestador: 'Jorge Daza' }),
  response({ id: 'resp-008', barrio: 'La Paz', category: 'alcantarillado', severity: 'media', date: '2026-08-07T10:35:00.000Z', description: 'Mal olor permanente por caño destapado', encuestador: 'María Fuentes' }),
  response({ id: 'resp-009', barrio: 'Cañaveral', category: 'otros', severity: 'baja', date: '2026-08-08T13:25:00.000Z', description: 'Basuras sin recolección oportuna los fines de semana', encuestador: 'María Fuentes' }),
  response({ id: 'resp-010', barrio: 'La Nevada', category: 'energia', severity: 'critica', date: '2026-08-09T07:55:00.000Z', description: 'Cables caídos sobre la vía principal', encuestador: 'Andrés Rincón' }),
  response({ id: 'resp-011', barrio: 'Los Cortijos', category: 'vias', severity: 'media', date: '2026-08-10T12:00:00.000Z', description: 'No pasa transporte público por falta de pavimento', encuestador: 'Andrés Rincón' }),
  response({ id: 'resp-012', barrio: 'El Prado', category: 'seguridad', severity: 'media', date: '2026-08-11T17:45:00.000Z', description: 'Robo de cables en el barrio', encuestador: 'Paola Mendoza' }),
  response({ id: 'resp-013', barrio: 'Dangond', category: 'espacios_publicos', severity: 'alta', date: '2026-08-12T09:30:00.000Z', description: 'Cancha comunal invadida por escombros', encuestador: 'Paola Mendoza' }),
  response({ id: 'resp-014', barrio: 'Garupal', category: 'alcantarillado', severity: 'baja', date: '2026-08-13T14:15:00.000Z', description: 'Sumidero obstruido que acumula agua cuando llueve', encuestador: 'Sofía Arregocés' }),
  response({ id: 'resp-015', barrio: 'Villa Castilla', category: 'energia', severity: 'media', date: '2026-08-14T18:20:00.000Z', description: 'Luminarias quemadas en toda la carrera 5', encuestador: 'Sofía Arregocés' }),
  response({ id: 'resp-016', barrio: '450 Años', category: 'vias', severity: 'alta', date: '2026-08-15T11:05:00.000Z', description: 'Baches profundos en la entrada principal', encuestador: 'Diego Molina' }),
  response({ id: 'resp-017', barrio: 'Novalito', category: 'otros', severity: 'media', date: '2026-08-16T16:40:00.000Z', description: 'Ruido constante de talleres mecánicos residenciales', encuestador: 'Diego Molina' }),
  response({ id: 'resp-018', barrio: 'Los Cerros', category: 'seguridad', severity: 'alta', date: '2026-08-17T20:30:00.000Z', description: 'Pandillismo en la zona alta del barrio', encuestador: 'Ana Martínez' }),
  response({ id: 'resp-019', barrio: 'Cañaveral', category: 'espacios_publicos', severity: 'media', date: '2026-08-18T10:10:00.000Z', description: 'Sendero peatonal sin mantenimiento', encuestador: 'Carlos Guerra' }),
  response({ id: 'resp-020', barrio: 'La Esperanza', category: 'energia', severity: 'baja', date: '2026-08-19T13:55:00.000Z', description: 'Parpadeos frecuentes del servicio eléctrico', encuestador: 'Laura Ospino' }),
]

/** Returns the more urgent of two severity levels. */
function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_WEIGHTS[a] >= SEVERITY_WEIGHTS[b] ? a : b
}

/** Mutable accumulator used while grouping responses (frozen into MapReport). */
interface ReportAccumulator {
  barrio: string
  comuna: string
  lat: number
  lng: number
  category: ComplaintCategory
  severity: Severity
  count: number
  lastDate: string
}

/**
 * Aggregates responses into one map report per (barrio, category) pair.
 * Reports are sorted deterministically by barrio name and canonical category order.
 *
 * @throws when a response references a barrio without registered coordinates.
 */
export function getMapReports(responses: readonly SurveyResponse[] = mockSurveyResponses): MapReport[] {
  const groups = new Map<string, ReportAccumulator>()
  for (const item of responses) {
    const location = BARRIO_LOCATIONS[item.barrio]
    if (!location) {
      throw new Error(`Barrio sin coordenadas registradas en mockData: "${item.barrio}"`)
    }
    const key = `${item.barrio}::${item.category}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      existing.severity = maxSeverity(existing.severity, item.severity)
      existing.lastDate = item.date > existing.lastDate ? item.date : existing.lastDate
      continue
    }
    groups.set(key, {
      barrio: item.barrio,
      comuna: location.comuna,
      lat: location.lat,
      lng: location.lng,
      category: item.category,
      severity: item.severity,
      count: 1,
      lastDate: item.date,
    })
  }
  return [...groups.values()]
    .map((entry) => ({
      id: `${entry.barrio}::${entry.category}`,
      barrio: entry.barrio,
      comuna: entry.comuna,
      lat: entry.lat,
      lng: entry.lng,
      category: entry.category,
      severity: entry.severity,
      count: entry.count,
      lastReportedAt: entry.lastDate,
    }))
    .sort(
      (a, b) =>
        a.barrio.localeCompare(b.barrio) ||
        ALL_CATEGORIES.indexOf(a.category) - ALL_CATEGORIES.indexOf(b.category),
    )
}

/** Most frequent category of a barrio; ties break by canonical order for determinism. */
function topCategoryOf(counts: ReadonlyMap<ComplaintCategory, number>): ComplaintCategory {
  let best: ComplaintCategory | undefined
  for (const category of ALL_CATEGORIES) {
    const count = counts.get(category) ?? 0
    const bestCount = best === undefined ? -1 : counts.get(best) ?? 0
    if (count > 0 && count > bestCount) {
      best = category
    }
  }
  if (best === undefined) {
    throw new Error('No se pudo determinar la categoría principal de un barrio')
  }
  return best
}

/** Period spanned by the responses; empty strings when there are no responses. */
function computePeriod(responses: readonly SurveyResponse[]): SummaryPeriod {
  if (responses.length === 0) {
    return { start: '', end: '' }
  }
  const dates = responses.map((item) => item.date)
  return {
    start: dates.reduce((a, b) => (a < b ? a : b)),
    end: dates.reduce((a, b) => (a > b ? a : b)),
  }
}

/** Mutable accumulator used while scoring barrios (frozen into readonly results). */
interface BarrioAccumulator {
  barrio: string
  comuna: string
  score: number
  categoryCounts: Map<ComplaintCategory, number>
}

/**
 * Builds the dashboard summary from the given responses: totals per category
 * and severity, barrios ranked by criticality (complaints weighted by
 * severity) and period. Defaults to the full mock dataset.
 */
export function getDashboardSummary(
  responses: readonly SurveyResponse[] = mockSurveyResponses,
): DashboardSummary {
  const byCategory: Record<ComplaintCategory, number> = {
    seguridad: 0,
    alcantarillado: 0,
    energia: 0,
    vias: 0,
    espacios_publicos: 0,
    otros: 0,
  }
  const bySeverity: Record<Severity, number> = {
    baja: 0,
    media: 0,
    alta: 0,
    critica: 0,
  }
  const barrios = new Map<string, BarrioAccumulator>()

  for (const item of responses) {
    byCategory[item.category] += 1
    bySeverity[item.severity] += 1

    const existing = barrios.get(item.barrio)
    if (existing) {
      existing.score += SEVERITY_WEIGHTS[item.severity]
      existing.categoryCounts.set(item.category, (existing.categoryCounts.get(item.category) ?? 0) + 1)
      continue
    }
    barrios.set(item.barrio, {
      barrio: item.barrio,
      comuna: item.comuna,
      score: SEVERITY_WEIGHTS[item.severity],
      categoryCounts: new Map([[item.category, 1]]),
    })
  }

  const criticalBarrios: CriticalBarrio[] = [...barrios.values()].map((entry) => ({
    barrio: entry.barrio,
    comuna: entry.comuna,
    score: entry.score,
    topCategory: topCategoryOf(entry.categoryCounts),
  }))
  criticalBarrios.sort(
    (a, b) => b.score - a.score || a.barrio.localeCompare(b.barrio),
  )

  return {
    totalResponses: responses.length,
    byCategory,
    bySeverity,
    criticalBarrios,
    period: computePeriod(responses),
  }
}
