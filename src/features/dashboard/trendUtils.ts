import type { SurveyResponse } from '../../lib/types'

/** One day of the trend chart: total reports and how many of those are crítica. */
export interface TrendPoint {
  readonly day: string
  readonly count: number
  readonly critical: number
}

function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

function parseUtcDay(day: string): Date {
  const parts = day.split('-').map(Number)
  const year = parts[0] ?? 1970
  const month = parts[1] ?? 1
  const date = parts[2] ?? 1
  return new Date(Date.UTC(year, month - 1, date))
}

function formatUtcDay(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Groups responses by ISO day and fills every day between the first and last
 * report so the area chart has no gaps. Empty input yields an empty array.
 */
export function dailyTrend(responses: readonly SurveyResponse[]): TrendPoint[] {
  if (responses.length === 0) {
    return []
  }
  const counts = new Map<string, { count: number; critical: number }>()
  let start = dayOf(responses[0]!.date)
  let end = start
  for (const item of responses) {
    const day = dayOf(item.date)
    const current = counts.get(day) ?? { count: 0, critical: 0 }
    current.count += 1
    if (item.severity === 'critica') {
      current.critical += 1
    }
    counts.set(day, current)
    if (day < start) {
      start = day
    }
    if (day > end) {
      end = day
    }
  }
  const points: TrendPoint[] = []
  const cursor = parseUtcDay(start)
  const last = parseUtcDay(end)
  while (cursor.getTime() <= last.getTime()) {
    const day = formatUtcDay(cursor)
    const current = counts.get(day)
    points.push({
      day,
      count: current?.count ?? 0,
      critical: current?.critical ?? 0,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return points
}
