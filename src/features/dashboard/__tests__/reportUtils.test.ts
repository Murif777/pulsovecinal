import { describe, expect, it } from 'vitest'
import { mockSurveyResponses } from '../../../lib/mockData'
import { tagMockResponses } from '../citizenReports'
import {
  paginate,
  sortRankingRows,
  sortReportRows,
  toCsv,
  toReportRows,
} from '../reportUtils'
import type { ReportRow } from '../reportUtils'

const rows = toReportRows(tagMockResponses(mockSurveyResponses))

describe('toReportRows', () => {
  it('maps sourced responses and fills a missing description with an empty string', () => {
    expect(rows).toHaveLength(20)
    expect(rows[0]?.id).toBe('resp-001')
    expect(rows[0]?.source).toBe('mock')
    expect(rows[0]?.description).toContain('Alcantarillado')

    const withoutDescription = toReportRows(
      tagMockResponses([{ ...mockSurveyResponses[0]!, description: undefined }]),
    )
    expect(withoutDescription[0]?.description).toBe('')
  })
})

describe('sortReportRows', () => {
  it('sorts by date descending by default order of newest first', () => {
    const sorted = sortReportRows(rows, 'date', 'desc')
    expect(sorted[0]?.id).toBe('resp-020')
    expect(sorted[sorted.length - 1]?.id).toBe('resp-001')
  })

  it('sorts by barrio ascending with Spanish collation', () => {
    const sorted = sortReportRows(rows, 'barrio', 'asc')
    expect(sorted[0]?.barrio).toBe('450 Años')
  })

  it('sorts by severity using the weighted order', () => {
    const sorted = sortReportRows(rows, 'severity', 'desc')
    expect(sorted[0]?.severity).toBe('critica')
    expect(sorted[sorted.length - 1]?.severity).toBe('baja')
  })
})

describe('paginate', () => {
  it('returns the requested page and clamps out-of-range pages', () => {
    const first = paginate(rows, 1, 8)
    expect(first.items).toHaveLength(8)
    expect(first.page).toBe(1)
    expect(first.totalPages).toBe(3)
    expect(first.total).toBe(20)

    const last = paginate(rows, 99, 8)
    expect(last.page).toBe(3)
    expect(last.items).toHaveLength(4)

    const empty = paginate([] as ReportRow[], 3, 8)
    expect(empty.page).toBe(1)
    expect(empty.totalPages).toBe(1)
    expect(empty.items).toHaveLength(0)
  })
})

describe('toCsv', () => {
  it('emits a BOM, semicolon delimiter and escaped quotes', () => {
    const sample: ReportRow[] = [
      {
        id: 'r-1',
        barrio: 'La Esperanza',
        comuna: 'Comuna 2',
        category: 'alcantarillado',
        severity: 'critica',
        description: 'Dijo "urgente"; revisar',
        date: '2026-08-01T14:30:00.000Z',
        encuestador: 'Ana Martínez',
        source: 'mock',
      },
    ]
    const csv = toCsv(sample)
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('id;barrio;comuna;categoría;severidad;descripción;fecha;encuestador;origen')
    expect(csv).toContain('"Dijo ""urgente""; revisar"')
    expect(csv).toContain('Crítica')
    expect(csv).toContain('Alcantarillado')
  })
})

describe('sortRankingRows', () => {
  const ranking = [
    { barrio: 'La Esperanza', score: 7, totalCount: 3 },
    { barrio: 'Los Cerros', score: 6, totalCount: 2 },
    { barrio: 'El Popul', score: 5, totalCount: 2 },
  ]

  it('sorts by score descending (default criticality order)', () => {
    const sorted = sortRankingRows(ranking, 'score', 'desc')
    expect(sorted.map((row) => row.barrio)).toEqual(['La Esperanza', 'Los Cerros', 'El Popul'])
  })

  it('sorts by barrio ascending', () => {
    const sorted = sortRankingRows(ranking, 'barrio', 'asc')
    expect(sorted.map((row) => row.barrio)).toEqual(['El Popul', 'La Esperanza', 'Los Cerros'])
  })
})
