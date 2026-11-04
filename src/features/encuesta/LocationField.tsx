import { useEffect, useRef, useState } from 'react'
import type { BarrioInfo } from '../../lib/api'
import { Icon } from '../../components/Icon'
import {
  LOCATION_WAIT_MS,
  MAX_ACCURACY_M,
  geolocationErrorMessage,
  isInsideValledupar,
  nearestBarrio,
  roundCoord,
} from './geo'
import type { CapturedLocation } from './geo'

type LocationFieldProps = {
  value: CapturedLocation | null
  onChange: (value: CapturedLocation | null) => void
  barrios: readonly BarrioInfo[] | null
  /** Barrio currently chosen in the form ('' when none). */
  selectedBarrio: string
  /** Called with the nearest barrio name so the form can prefill an empty select. */
  onSuggestBarrio: (barrio: string) => void
  disabled?: boolean
}

type Status = 'idle' | 'locating' | 'error'

/**
 * Optional "add my current location" control.
 *
 * Consent comes first: the button stays disabled until the citizen ticks the
 * authorization box (prior, express and informed consent). The browser then asks
 * for the GPS permission, and the point is only attached once its accuracy radius
 * is within MAX_ACCURACY_M; otherwise nothing is attached.
 */
export default function LocationField({
  value,
  onChange,
  barrios,
  selectedBarrio,
  onSuggestBarrio,
  disabled = false,
}: LocationFieldProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  // Stop an in-flight GPS watch if the form unmounts.
  useEffect(() => () => stopRef.current?.(), [])

  function fail(text: string) {
    stopRef.current?.()
    setStatus('error')
    setMessage(text)
    setCurrentAccuracy(null)
  }

  function locate() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fail('Tu navegador no permite obtener la ubicación.')
      return
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      fail('La ubicación solo funciona en conexiones seguras (HTTPS).')
      return
    }
    setStatus('locating')
    setMessage(null)
    setCurrentAccuracy(null)

    let best: GeolocationPosition | null = null
    let finished = false
    let watchId: number | null = null

    const timer = setTimeout(() => {
      if (finished) {
        return
      }
      const reached = best === null ? null : Math.round(best.coords.accuracy)
      fail(
        reached === null
          ? geolocationErrorMessage(3)
          : `La mejor precisión fue de unos ${reached} m y se necesitan ${MAX_ACCURACY_M} m o menos. Sal a un lugar abierto, activa el GPS e intenta de nuevo, o elige el barrio de la lista.`,
      )
    }, LOCATION_WAIT_MS)

    // Defined (and registered) before watchPosition: a callback may fire synchronously.
    stopRef.current = () => {
      finished = true
      clearTimeout(timer)
      if (watchId !== null) {
        navigator.geolocation?.clearWatch(watchId)
      }
      stopRef.current = null
    }

    const accept = (position: GeolocationPosition) => {
      const lat = roundCoord(position.coords.latitude)
      const lng = roundCoord(position.coords.longitude)
      if (!isInsideValledupar(lat, lng)) {
        fail(
          'Tu ubicación parece estar fuera de Valledupar, así que no se agregó. Elige el barrio de la lista.',
        )
        return
      }
      stopRef.current?.()
      onChange({ lat, lng, accuracy: Math.round(position.coords.accuracy) })
      setStatus('idle')
      setMessage(null)
      setCurrentAccuracy(null)
      if (selectedBarrio === '' && barrios !== null) {
        const near = nearestBarrio(lat, lng, barrios)
        if (near !== null) {
          onSuggestBarrio(near.nombre)
        }
      }
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (finished) {
          return
        }
        if (best === null || position.coords.accuracy < best.coords.accuracy) {
          best = position
        }
        setCurrentAccuracy(Math.round(best.coords.accuracy))
        if (best.coords.accuracy <= MAX_ACCURACY_M) {
          accept(best)
        }
      },
      (error) => {
        if (!finished) {
          fail(geolocationErrorMessage(error.code))
        }
      },
      { enableHighAccuracy: true, timeout: LOCATION_WAIT_MS + 5_000, maximumAge: 0 },
    )
    watchId = id
    if (finished) {
      // The watch already completed synchronously, before we had its id.
      navigator.geolocation.clearWatch(id)
    }
  }

  const locating = status === 'locating'

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {value === null ? (
        <>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={disabled || locating}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400 text-brand-700 focus:ring-brand-600"
            />
            <span>
              Autorizo que se guarde mi ubicación aproximada y se muestre en el mapa público, sin mi
              nombre ni datos de contacto.{' '}
              <a
                href="/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline underline-offset-4"
              >
                Leer la política de datos
              </a>
            </span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={locate}
              disabled={disabled || locating || !consent}
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="pin" className="h-4 w-4" />
              {locating ? 'Buscando tu ubicación…' : 'Agregar mi ubicación actual'}
            </button>
            {locating && (
              <p role="status" className="text-sm font-medium text-slate-600">
                {currentAccuracy === null
                  ? 'Esperando señal del GPS…'
                  : `Precisión actual: ${currentAccuracy} m (necesitamos ${MAX_ACCURACY_M} m o menos)`}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-800">
            <Icon name="pin" className="h-4 w-4" />
            Ubicación agregada · precisión de unos {value.accuracy} m
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="rounded-md text-sm font-semibold text-pulse-600 underline underline-offset-4 hover:text-pulse-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-600"
          >
            Quitar
          </button>
        </div>
      )}
      {message !== null && (
        <p role="alert" className="mt-3 text-sm font-medium text-pulse-600">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Es opcional: puedes enviar el reporte sin ubicación. Solo se pide cuando pulsas el botón y se
        toma con una precisión de {MAX_ACCURACY_M} m o menos.
      </p>
    </div>
  )
}
