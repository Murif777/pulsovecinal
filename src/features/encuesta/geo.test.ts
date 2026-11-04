import { describe, expect, it } from 'vitest'
import {
  distanceMeters,
  geolocationErrorMessage,
  isInsideValledupar,
  nearestBarrio,
  roundCoord,
} from './geo'

const BARRIOS = [
  { nombre: 'La Esperanza', comuna: 'Comuna 2', lat: 10.4721, lng: -73.2405 },
  { nombre: 'Cañaveral', comuna: 'Comuna 5', lat: 10.443, lng: -73.272 },
]

describe('geo helpers', () => {
  it('rounds coordinates to 5 decimals (about 1 m)', () => {
    expect(roundCoord(10.4721494)).toBe(10.47215)
    expect(roundCoord(-73.2405512)).toBe(-73.24055)
  })

  it('detects whether a point is inside the Valledupar rectangle', () => {
    expect(isInsideValledupar(10.4721, -73.2405)).toBe(true)
    expect(isInsideValledupar(4.711, -74.0721)).toBe(false) // Bogotá
  })

  it('computes haversine distance', () => {
    expect(distanceMeters(10.4721, -73.2405, 10.4721, -73.2405)).toBe(0)
    const km = distanceMeters(10.4721, -73.2405, 10.443, -73.272) / 1000
    expect(km).toBeGreaterThan(4)
    expect(km).toBeLessThan(6)
  })

  it('finds the nearest barrio and handles an empty registry', () => {
    expect(nearestBarrio(10.473, -73.241, BARRIOS)?.nombre).toBe('La Esperanza')
    expect(nearestBarrio(10.44, -73.27, BARRIOS)?.nombre).toBe('Cañaveral')
    expect(nearestBarrio(10.44, -73.27, [])).toBeNull()
  })

  it('maps geolocation error codes to Spanish messages', () => {
    expect(geolocationErrorMessage(1)).toMatch(/permiso/)
    expect(geolocationErrorMessage(2)).toMatch(/No se pudo determinar/)
    expect(geolocationErrorMessage(3)).toMatch(/Tardó demasiado/)
  })
})
