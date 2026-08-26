import { describe, expect, it } from 'vitest'
import { mockSurveyResponses } from '../../../lib/mockData'
import {
  activeFilterChips,
  activeFilterCount,
  applyFilters,
  dateBounds,
  EMPTY_FILTERS,
  normalizeSearch,
  presetRange,
  removeFilterChip,
  toggleInList,
} from '../filterUtils'
import type { DashboardFilters } from '../filterUtils'

const base: DashboardFilters = { ...EMPTY_FILTERS }

describe('normalizeSearch', () => {
  it('strips accents and lowercases so Cañaveral matches canaveral', () => {
    expect(normalizeSearch('Cañaveral')).toBe('canaveral')
    expect(normalizeSearch('  LA ESPERANZA  ')).toBe('la esperanza')
  })
})

describe('applyFilters', () => {
  it('returns the full dataset when every group is empty', () => {
    expect(applyFilters(mockSurveyResponses, base)).toHaveLength(20)
  })

  it('filters by comuna with AND semantics against other groups', () => {
    const filtered = applyFilters(mockSurveyResponses, {
      ...base,
      comunas: ['Comuna 2'],
      categories: ['alcantarillado'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.barrio).toBe('La Esperanza')
  })

  it('matches barrio or description after accent-insensitive search', () => {
    const byBarrio = applyFilters(mockSurveyResponses, { ...base, search: 'canaveral' })
    expect(byBarrio.every((item) => item.barrio === 'Cañaveral')).toBe(true)
    expect(byBarrio.length).toBeGreaterThan(0)

    const byDescription = applyFilters(mockSurveyResponses, { ...base, search: 'cables caídos' })
    expect(byDescription).toHaveLength(1)
    expect(byDescription[0]?.barrio).toBe('La Nevada')
  })

  it('keeps responses inside an inclusive date range', () => {
    const filtered = applyFilters(mockSurveyResponses, {
      ...base,
      from: '2026-08-01',
      to: '2026-08-03',
    })
    expect(filtered.map((item) => item.id)).toEqual(['resp-001', 'resp-002', 'resp-003'])
  })

  it('filters by severity', () => {
    const filtered = applyFilters(mockSurveyResponses, { ...base, severities: ['critica'] })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((item) => item.severity === 'critica')).toBe(true)
  })
})

describe('activeFilterCount / chips', () => {
  it('counts each active group once', () => {
    expect(activeFilterCount(base)).toBe(0)
    expect(
      activeFilterCount({
        ...base,
        search: 'esperanza',
        comunas: ['Comuna 2', 'Comuna 1'],
        includeCitizen: true,
      }),
    ).toBe(3)
  })

  it('builds removable chips and removeFilterChip clears the matching group', () => {
    const filters: DashboardFilters = {
      ...base,
      search: 'esperanza',
      comunas: ['Comuna 2'],
      categories: ['energia'],
      severities: ['alta'],
      from: '2026-08-01',
      to: '2026-08-10',
      includeCitizen: true,
    }
    const chips = activeFilterChips(filters)
    expect(chips.map((chip) => chip.key)).toEqual([
      'search',
      'comuna:Comuna 2',
      'category:energia',
      'severity:alta',
      'period',
      'citizen',
    ])
    expect(chips.find((chip) => chip.key === 'category:energia')?.label).toBe('Energía eléctrica')

    expect(removeFilterChip(filters, 'search').search).toBe('')
    expect(removeFilterChip(filters, 'comuna:Comuna 2').comunas).toEqual([])
    expect(removeFilterChip(filters, 'citizen').includeCitizen).toBe(false)
    expect(removeFilterChip(filters, 'period').from).toBeNull()
  })
})

describe('dateBounds / presetRange', () => {
  it('returns the min and max YYYY-MM-DD of the mock dataset', () => {
    expect(dateBounds(mockSurveyResponses)).toEqual({ start: '2026-08-01', end: '2026-08-19' })
    expect(dateBounds([])).toEqual({ start: '', end: '' })
  })

  it('computes inclusive 7-day and 15-day windows from a UTC end date', () => {
    const end = new Date('2026-08-19T12:00:00.000Z')
    expect(presetRange('all', end)).toEqual({ from: null, to: null })
    expect(presetRange('7d', end)).toEqual({ from: '2026-08-13', to: '2026-08-19' })
    expect(presetRange('15d', end)).toEqual({ from: '2026-08-05', to: '2026-08-19' })
  })
})

describe('toggleInList', () => {
  it('adds a missing value and removes an existing one', () => {
    expect(toggleInList(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleInList(['a', 'b'], 'a')).toEqual(['b'])
  })
})
