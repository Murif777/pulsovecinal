import { describe, expect, it } from 'vitest'
import { getDashboardSummary, getMapReports, mockSurveyResponses } from '../mockData'
import { ALL_CATEGORIES, ALL_SEVERITIES, CATEGORY_LABELS } from '../types'

describe('mockSurveyResponses', () => {
  it('has every response with a valid category from the six supported ones', () => {
    expect(ALL_CATEGORIES).toHaveLength(6)

    for (const response of mockSurveyResponses) {
      expect(ALL_CATEGORIES).toContain(response.category)
      expect(CATEGORY_LABELS[response.category]).toBeTruthy()
    }
  })

  it('has every response with a valid severity', () => {
    for (const response of mockSurveyResponses) {
      expect(ALL_SEVERITIES).toContain(response.severity)
    }
  })

  it('includes at least one response for each of the four severity levels', () => {
    const used = new Set(mockSurveyResponses.map((response) => response.severity))

    for (const severity of ALL_SEVERITIES) {
      expect(used).toContain(severity)
    }
  })

  it('resolves the comuna of every response against a known Valledupar barrio', () => {
    // getMapReports throws when a barrio has no registered coordinates,
    // so a successful aggregation proves the whole array is geocodable.
    const reports = getMapReports()

    expect(reports.length).toBeGreaterThan(0)
  })
})

describe('getDashboardSummary', () => {
  it('totals per category are consistent with the mock array length', () => {
    const summary = getDashboardSummary()
    const categoryTotal = Object.values(summary.byCategory).reduce((sum, count) => sum + count, 0)

    expect(Object.keys(summary.byCategory)).toHaveLength(6)
    expect(summary.totalResponses).toBe(mockSurveyResponses.length)
    expect(categoryTotal).toBe(summary.totalResponses)
  })

  it('totals per severity are consistent with the mock array length', () => {
    const summary = getDashboardSummary()
    const severityTotal = Object.values(summary.bySeverity).reduce((sum, count) => sum + count, 0)

    expect(Object.keys(summary.bySeverity)).toHaveLength(4)
    expect(severityTotal).toBe(summary.totalResponses)
  })

  it('ranks barrios by criticality in descending score order', () => {
    const summary = getDashboardSummary()

    expect(summary.criticalBarrios.length).toBeGreaterThan(0)
    const scores = summary.criticalBarrios.map((barrio) => barrio.score)
    const descending = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(descending)
  })

  it('covers the period spanned by the mock responses', () => {
    const summary = getDashboardSummary()
    const dates = mockSurveyResponses.map((response) => response.date)
    const earliest = dates.reduce((a, b) => (a < b ? a : b))
    const latest = dates.reduce((a, b) => (a > b ? a : b))

    expect(summary.period.start).toBe(earliest)
    expect(summary.period.end).toBe(latest)
  })
})

describe('getMapReports', () => {
  it('aggregates one report per barrio and category without losing responses', () => {
    const reports = getMapReports()
    const aggregatedCount = reports.reduce((sum, report) => sum + report.count, 0)

    expect(aggregatedCount).toBe(mockSurveyResponses.length)
  })

  it('exposes count and lastReportedAt per aggregation group', () => {
    const reports = getMapReports()
    const populEnergia = reports.find((report) => report.barrio === 'El Popul' && report.category === 'energia')

    expect(populEnergia?.count).toBe(2)
    expect(populEnergia?.lastReportedAt).toBe('2026-08-04T11:40:00.000Z')
  })

  it('places every report inside Valledupar bounds', () => {
    for (const report of getMapReports()) {
      expect(report.lat).toBeGreaterThan(10.4)
      expect(report.lat).toBeLessThan(10.5)
      expect(report.lng).toBeGreaterThan(-73.3)
      expect(report.lng).toBeLessThan(-73.2)
    }
  })
})
