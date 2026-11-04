import type { BarrioInfo } from '../../lib/api'

/**
 * Helpers for the "add my current location" flow of the survey form.
 * Pure functions only (no DOM access) so they are unit-testable.
 */

/** Position captured from the browser, already rounded for storage. */
export type CapturedLocation = {
  readonly lat: number
  readonly lng: number
  /** Browser-reported accuracy radius in meters. */
  readonly accuracy: number
}

/**
 * Rectangle around the Valledupar urban area. A fix outside it is almost
 * certainly a VPN / desktop IP-geolocation result, not the citizen's block.
 */
export const VALLEDUPAR_BOUNDS = {
  minLat: 10.38,
  maxLat: 10.54,
  minLng: -73.34,
  maxLng: -73.18,
} as const

/**
 * A fix is only attached to a report when its accuracy radius is this small
 * (meters). 150 m is a deliberately generous margin: it keeps the flow usable
 * indoors and on devices without a real GPS, while still rejecting the
 * kilometre-scale errors that IP geolocation produces.
 */
export const MAX_ACCURACY_M = 150

/** How long to wait for the GPS to reach MAX_ACCURACY_M before giving up (ms). */
export const LOCATION_WAIT_MS = 15_000

/**
 * Coordinates are stored with 5 decimals (about 1 m), which is finer than the
 * GPS error we accept. The public map only ever receives them rounded to 4.
 */
export function roundCoord(value: number): number {
  return Math.round(value * 100_000) / 100_000
}

export function isInsideValledupar(lat: number, lng: number): boolean {
  return (
    lat >= VALLEDUPAR_BOUNDS.minLat &&
    lat <= VALLEDUPAR_BOUNDS.maxLat &&
    lng >= VALLEDUPAR_BOUNDS.minLng &&
    lng <= VALLEDUPAR_BOUNDS.maxLng
  )
}

/** Haversine distance in meters. */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/** Barrio whose centroid is closest to the point, or null for an empty registry. */
export function nearestBarrio(
  lat: number,
  lng: number,
  barrios: readonly BarrioInfo[],
): BarrioInfo | null {
  let best: BarrioInfo | null = null
  let bestDistance = Infinity
  for (const barrio of barrios) {
    const distance = distanceMeters(lat, lng, barrio.lat, barrio.lng)
    if (distance < bestDistance) {
      best = barrio
      bestDistance = distance
    }
  }
  return best
}

/** Human message for a GeolocationPositionError code (1 denied, 2 unavailable, 3 timeout). */
export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'No diste permiso para usar tu ubicación. Puedes activarlo en el candado de la barra del navegador o seguir sin ella.'
    case 2:
      return 'No se pudo determinar tu ubicación. Revisa que el GPS o la red estén activos e intenta de nuevo.'
    case 3:
      return 'Tardó demasiado en obtener tu ubicación. Intenta de nuevo.'
    default:
      return 'No se pudo obtener tu ubicación.'
  }
}
