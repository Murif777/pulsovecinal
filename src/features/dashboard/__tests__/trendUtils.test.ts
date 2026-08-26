import { describe, expect, it } from 'vitest'
import { mockSurveyResponses } from '../../../lib/mockData'
import { dailyTrend } from '../trendUtils'

describe('dailyTrend', () => {
  it('returns an empty array for an empty input', () => {
    expect(dailyTrend([])).toEqual([])
  })

  it('fills every day between the first and last report of the mock dataset', () => {
    const points = dailyTrend(mockSurveyResponses)
    expect(points[0]?.day).toBe('2026-08-01')
    expect(points[points.length - 1]?.day).toBe('2026-08-19')
    expect(points).toHaveLength(19)
    expect(points.reduce((sum, point) => sum + point.count, 0)).toBe(20)
    expect(points.reduce((sum, point) => sum + point.critical, 0)).toBe(2)
  })

  it('inserts zero-count days in the gaps', () => {
    const sparse = [
      mockSurveyResponses[0]!,
      mockSurveyResponses[2]!,
    ]
    const points = dailyTrend(sparse)
    expect(points.map((point) => point.day)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(points[1]).toEqual({ day: '2026-08-02', count: 0, critical: 0 })
    expect(points[0]?.critical).toBe(1)
  })
})
