import { beforeEach, describe, expect, it } from 'vitest'
import { installMemoryLocalStorage } from './memoryLocalStorage'
import {
  appendSurveyResponse,
  createSurveyResponse,
  isSurveyResponse,
  loadSurveyResponses,
  saveSurveyResponses,
  SURVEY_STORAGE_KEY,
} from './storage'

const sample = {
  barrio: 'La Esperanza',
  category: 'alcantarillado' as const,
  severity: 'alta' as const,
  description: 'Caño destapado en la carrera 7',
}

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('createSurveyResponse', () => {
  it('fills comuna from the local barrio registry and omits encuestador', () => {
    const response = createSurveyResponse(sample)

    expect(response.barrio).toBe('La Esperanza')
    expect(response.comuna).toBe('Comuna 2')
    expect(response.category).toBe('alcantarillado')
    expect(response.severity).toBe('alta')
    expect(response.description).toBe(sample.description)
    expect(response.encuestador).toBeUndefined()
    expect(response.id).toBeTruthy()
    expect(response.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('throws when the barrio is not registered', () => {
    expect(() => createSurveyResponse({ ...sample, barrio: 'Barrio Inventado' })).toThrow(/Barrio desconocido/)
  })
})

describe('loadSurveyResponses / saveSurveyResponses', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(loadSurveyResponses()).toEqual([])
  })

  it('round-trips valid responses through localStorage', () => {
    const response = createSurveyResponse(sample)
    saveSurveyResponses([response])

    expect(window.localStorage.getItem(SURVEY_STORAGE_KEY)).toBeTruthy()
    expect(loadSurveyResponses()).toEqual([response])
  })

  it('drops malformed entries and non-array payloads', () => {
    window.localStorage.setItem(SURVEY_STORAGE_KEY, '{"not":"an array"}')
    expect(loadSurveyResponses()).toEqual([])

    const valid = createSurveyResponse(sample)
    window.localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify([valid, { id: 1 }, 'nope']))
    expect(loadSurveyResponses()).toEqual([valid])
  })
})

describe('appendSurveyResponse', () => {
  it('appends to whatever is already stored', () => {
    const first = createSurveyResponse(sample)
    const second = createSurveyResponse({ ...sample, barrio: 'El Popul', description: 'Apagones en la cuadra 18' })

    appendSurveyResponse(first)
    const all = appendSurveyResponse(second)

    expect(all).toHaveLength(2)
    expect(all[0]?.id).toBe(first.id)
    expect(all[1]?.id).toBe(second.id)
    expect(all[1]?.comuna).toBe('Comuna 1')
  })
})

describe('isSurveyResponse', () => {
  it('accepts a well-formed stored object and rejects an unknown barrio', () => {
    const valid = createSurveyResponse(sample)

    expect(isSurveyResponse(valid)).toBe(true)
    expect(isSurveyResponse({ ...valid, barrio: 'No Existe' })).toBe(false)
  })
})

describe('storage shim (encuesta/storage re-exports lib/surveyStorage)', () => {
  it('re-exports the canonical implementation from src/lib/surveyStorage', async () => {
    const lib = await import('../../lib/surveyStorage')

    expect(loadSurveyResponses).toBe(lib.loadSurveyResponses)
    expect(saveSurveyResponses).toBe(lib.saveSurveyResponses)
    expect(appendSurveyResponse).toBe(lib.appendSurveyResponse)
    expect(createSurveyResponse).toBe(lib.createSurveyResponse)
    expect(isSurveyResponse).toBe(lib.isSurveyResponse)
    expect(SURVEY_STORAGE_KEY).toBe(lib.SURVEY_STORAGE_KEY)
  })

  it('round-trips a response through the shim with memory localStorage', () => {
    const response = createSurveyResponse(sample)
    saveSurveyResponses([response])

    expect(loadSurveyResponses()).toEqual([response])
  })
})
