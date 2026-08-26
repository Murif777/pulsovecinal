import { describe, expect, it } from 'vitest'
import type { MapReport, Severity } from '../../../lib/types'
import {
  aggregateByBarrio,
  filterReports,
  radiusForCount,
  severityColor,
} from '../mapUtils'

/** Builds a minimal MapReport with sensible defaults for focused unit tests. */
function report(overrides: Partial<MapReport> & Pick<MapReport, 'barrio' | 'category'>): MapReport {
  return {
    id: `${overrides.barrio}::${overrides.category}`,
    comuna: 'Comuna 1',
    lat: 10.46,
    lng: -73.25,
    severity: 'baja',
    count: 1,
    lastReportedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('severityColor', () => {
  it.each(
    [
      { severity: 'baja', expected: '#22c55e' },
      { severity: 'media', expected: '#eab308' },
      { severity: 'alta', expected: '#f97316' },
      { severity: 'critica', expected: '#ef4444' },
    ] satisfies ReadonlyArray<{ severity: Severity; expected: string }>,
  )('maps $severity to its traffic-light hex $expected', ({ severity, expected }) => {
    expect(severityColor(severity)).toBe(expected)
  })
})

describe('radiusForCount', () => {
  it('scales linearly between 6px and 22px and returns minR when min equals max', () => {
    expect(radiusForCount(1, 1, 3)).toBe(6)
    expect(radiusForCount(2, 1, 3)).toBe(14)
    expect(radiusForCount(3, 1, 3)).toBe(22)
    expect(radiusForCount(5, 2, 2)).toBe(6)
  })
})

describe('aggregateByBarrio', () => {
  it('groups by barrio summing counts, keeping the max severity and sorting by name', () => {
    const reports = [
      report({ barrio: 'El Popul', category: 'energia', severity: 'alta', count: 2 }),
      report({ barrio: 'La Esperanza', category: 'seguridad', severity: 'media' }),
      report({ barrio: 'La Esperanza', category: 'alcantarillado', severity: 'critica' }),
    ]

    const markers = aggregateByBarrio(reports)

    expect(markers.map((marker) => marker.barrio)).toEqual(['El Popul', 'La Esperanza'])
    expect(markers[0]?.count).toBe(2)
    expect(markers[0]?.maxSeverity).toBe('alta')
    expect(markers[1]?.count).toBe(2)
    expect(markers[1]?.maxSeverity).toBe('critica')
  })

  it('produces the per-category breakdown counts when aggregating', () => {
    const reports = [
      report({ barrio: 'La Esperanza', category: 'seguridad', severity: 'media' }),
      report({ barrio: 'La Esperanza', category: 'energia', severity: 'baja' }),
      report({ barrio: 'Villa Rosa', category: 'espacios_publicos', severity: 'baja' }),
    ]

    const [esperanza] = aggregateByBarrio(reports)

    expect(esperanza?.byCategory).toEqual({
      seguridad: 1,
      alcantarillado: 0,
      energia: 1,
      vias: 0,
      espacios_publicos: 0,
      otros: 0,
    })
  })
})

describe('filterReports', () => {
  it('filters reports by category', () => {
    const reports = [
      report({ barrio: 'A', category: 'seguridad' }),
      report({ barrio: 'B', category: 'vias' }),
    ]

    const result = filterReports(reports, { categories: ['seguridad'], severities: [], comunas: [] })

    expect(result.map((item) => item.barrio)).toEqual(['A'])
  })

  it('filters reports by severity with exact match', () => {
    const reports = [
      report({ barrio: 'A', category: 'seguridad', severity: 'critica' }),
      report({ barrio: 'B', category: 'vias', severity: 'alta' }),
      report({ barrio: 'C', category: 'otros', severity: 'media' }),
    ]

    const result = filterReports(reports, { categories: [], severities: ['critica'], comunas: [] })

    expect(result.map((item) => item.barrio)).toEqual(['A'])
  })

  it('filters reports by comuna', () => {
    const reports = [
      report({ barrio: 'A', category: 'seguridad', comuna: 'Comuna 2' }),
      report({ barrio: 'B', category: 'vias', comuna: 'Comuna 5' }),
    ]

    const result = filterReports(reports, { categories: [], severities: [], comunas: ['Comuna 5'] })

    expect(result.map((item) => item.barrio)).toEqual(['B'])
  })

  it('passes every report through with empty filters without mutating the input', () => {
    const reports = [
      report({ barrio: 'A', category: 'seguridad' }),
      report({ barrio: 'B', category: 'vias', severity: 'alta' }),
    ]

    const result = filterReports(reports, { categories: [], severities: [], comunas: [] })

    expect(result).toEqual(reports)
    expect(result).not.toBe(reports)
    expect(reports).toHaveLength(2)
  })
})
