import { describe, expect, it } from 'vitest'
import { getDashboardSummary, getMapReports, mockSurveyResponses } from '../../../lib/mockData'
import { CATEGORY_LABELS } from '../../../lib/types'
import {
  buildRanking,
  categoryDistribution,
  comunaOptions,
  computeKpis,
  filterResponsesByComuna,
  severityDistribution,
} from '../dashboardUtils'

const fullSummary = getDashboardSummary()
const fullReports = getMapReports()

describe('computeKpis', () => {
  it('returns the four KPIs of the full dataset (20, 15, energia, 2)', () => {
    const kpis = computeKpis(fullSummary)

    expect(kpis.totalResponses).toBe(20)
    expect(kpis.barriosCubiertos).toBe(15)
    expect(kpis.topCategory).toBe('energia')
    expect(kpis.topCategoryCount).toBe(5)
    expect(kpis.criticalCount).toBe(2)
  })

  it('re-derives the KPIs over a filtered subset (Comuna 2 → 5, 3, 1)', () => {
    const filtered = filterResponsesByComuna(mockSurveyResponses, 'Comuna 2')
    const kpis = computeKpis(getDashboardSummary(filtered))

    expect(kpis.totalResponses).toBe(5)
    expect(kpis.barriosCubiertos).toBe(3)
    // Every category is tied at 1 in Comuna 2; the canonical tie-break
    // (mockData.topCategoryOf) picks the first category in canonical order.
    expect(kpis.topCategory).toBe('seguridad')
    expect(kpis.criticalCount).toBe(1)
  })
})

describe('buildRanking', () => {
  it('enriches critical barrios with totalCount and preserves the score order', () => {
    const ranking = buildRanking(fullSummary, fullReports)

    expect(ranking[0]?.barrio).toBe('La Esperanza')
    expect(ranking[0]?.score).toBe(7)
    expect(ranking[0]?.totalCount).toBe(3)
    // La Esperanza ties at 1 report per category; the canonical tie-break
    // (mockData.topCategoryOf) picks 'seguridad' (first in canonical order).
    expect(ranking[0]?.topCategory).toBe('seguridad')
    expect(ranking[1]?.barrio).toBe('Los Cerros')
    expect(ranking[1]?.score).toBe(6)
    expect(ranking[2]?.barrio).toBe('El Popul')
    expect(ranking[2]?.score).toBe(5)
  })
})

describe('categoryDistribution', () => {
  it('maps the six categories to { category, label, count } using CATEGORY_LABELS', () => {
    const distribution = categoryDistribution(fullSummary)

    expect(distribution).toHaveLength(6)
    expect(distribution[0]).toEqual({
      category: 'seguridad',
      label: CATEGORY_LABELS.seguridad,
      count: 4,
    })
    expect(distribution.map((entry) => entry.label)).toEqual([
      'Seguridad',
      'Alcantarillado',
      'Energía eléctrica',
      'Vías y transporte',
      'Espacios públicos',
      'Otros',
    ])
    expect(distribution.reduce((sum, entry) => sum + entry.count, 0)).toBe(20)
  })
})

describe('severityDistribution', () => {
  it('maps the four severities with the traffic-light hex colors', () => {
    const distribution = severityDistribution(fullSummary)

    expect(distribution).toHaveLength(4)
    expect(distribution[0]).toEqual({ severity: 'baja', label: 'Baja', count: 4, color: '#22c55e' })
    expect(distribution[1]).toEqual({ severity: 'media', label: 'Media', count: 8, color: '#eab308' })
    expect(distribution[2]).toEqual({ severity: 'alta', label: 'Alta', count: 6, color: '#f97316' })
    expect(distribution[3]).toEqual({ severity: 'critica', label: 'Crítica', count: 2, color: '#ef4444' })
  })
})

describe('filterResponsesByComuna / comunaOptions', () => {
  it('filters responses by comuna and lists the six comunas sorted', () => {
    const filtered = filterResponsesByComuna(mockSurveyResponses, 'Comuna 2')

    expect(filtered).toHaveLength(5)
    expect(filtered.every((item) => item.comuna === 'Comuna 2')).toBe(true)
    expect(filterResponsesByComuna(mockSurveyResponses, null)).toHaveLength(20)

    expect(comunaOptions(mockSurveyResponses)).toEqual([
      'Comuna 1',
      'Comuna 2',
      'Comuna 3',
      'Comuna 4',
      'Comuna 5',
      'Comuna 6',
    ])
  })
})