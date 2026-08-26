import { beforeEach, describe, expect, it } from 'vitest'
import { mockSurveyResponses } from '../../../lib/mockData'
import { CITIZEN_STORAGE_KEY, isSurveyResponse, knownBarrios, loadCitizenResponses, mergeResponses, tagMockResponses } from '../citizenReports'
import { installMemoryLocalStorage } from './memoryLocalStorage'

const validCitizen = {
  id: 'citizen-001',
  barrio: 'La Esperanza',
  comuna: 'Comuna 2',
  category: 'alcantarillado',
  severity: 'alta',
  description: 'Caño destapado reportado por un vecino',
  date: '2026-08-20T10:00:00.000Z',
}

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('knownBarrios', () => {
  it('contains the mock barrios that getMapReports can geocode', () => {
    const barrios = knownBarrios()

    expect(barrios.has('La Esperanza')).toBe(true)
    expect(barrios.has('Novalito')).toBe(true)
    expect(barrios.has('Barrio Inventado')).toBe(false)
  })
})

describe('isSurveyResponse', () => {
  const barrios = knownBarrios()

  it('accepts a well-formed citizen payload', () => {
    expect(isSurveyResponse(validCitizen, barrios)).toBe(true)
  })

  it('rejects unknown barrios even when the rest of the shape is valid', () => {
    expect(isSurveyResponse({ ...validCitizen, barrio: 'Barrio Inventado' }, barrios)).toBe(false)
  })

  it('rejects missing ids and invalid categories', () => {
    expect(isSurveyResponse({ ...validCitizen, id: '' }, barrios)).toBe(false)
    expect(isSurveyResponse({ ...validCitizen, category: 'nope' }, barrios)).toBe(false)
  })
})

describe('loadCitizenResponses', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(loadCitizenResponses()).toEqual([])
  })

  it('tags valid entries as ciudadano and drops unknown barrios and junk', () => {
    window.localStorage.setItem(
      CITIZEN_STORAGE_KEY,
      JSON.stringify([
        validCitizen,
        { ...validCitizen, id: 'citizen-bad', barrio: 'Barrio Inventado' },
        { id: 1 },
        'nope',
      ]),
    )

    const loaded = loadCitizenResponses()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.id).toBe('citizen-001')
    expect(loaded[0]?.source).toBe('ciudadano')
    expect(loaded[0]?.barrio).toBe('La Esperanza')
  })

  it('returns an empty array for a corrupted JSON payload', () => {
    window.localStorage.setItem(CITIZEN_STORAGE_KEY, '{not json')
    expect(loadCitizenResponses()).toEqual([])
  })

  it('returns an empty array for a non-array payload', () => {
    window.localStorage.setItem(CITIZEN_STORAGE_KEY, '{"not":"an array"}')
    expect(loadCitizenResponses()).toEqual([])
  })
})

describe('tagMockResponses / mergeResponses', () => {
  it('tags every mock row as mock', () => {
    const tagged = tagMockResponses(mockSurveyResponses)
    expect(tagged).toHaveLength(20)
    expect(tagged.every((item) => item.source === 'mock')).toBe(true)
  })

  it('keeps the mock-only dataset when includeCitizen is false', () => {
    window.localStorage.setItem(CITIZEN_STORAGE_KEY, JSON.stringify([validCitizen]))
    const merged = mergeResponses(mockSurveyResponses, false)
    expect(merged).toHaveLength(20)
    expect(merged.every((item) => item.source === 'mock')).toBe(true)
  })

  it('appends citizen rows after the mock when includeCitizen is true', () => {
    window.localStorage.setItem(CITIZEN_STORAGE_KEY, JSON.stringify([validCitizen]))
    const merged = mergeResponses(mockSurveyResponses, true)
    expect(merged).toHaveLength(21)
    expect(merged[20]?.id).toBe('citizen-001')
    expect(merged[20]?.source).toBe('ciudadano')
  })
})
