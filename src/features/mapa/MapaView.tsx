import { useEffect, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '../../lib/types'
import { SEVERITY_LABELS } from '../encuesta/labels'
import type { BarrioMarker } from './mapUtils'
import { CategoryIcon } from '../../components/Icon'
import { CATEGORY_LABELS } from '../../lib/types'
import { breakdownByCategory, radiusForCount, severityColor } from './mapUtils'
import './mapa.css'

/** City center of Valledupar used as the initial map viewport. */
const VALLEDUPAR_CENTER: [number, number] = [10.46, -73.25]

type MapaViewProps = {
  /** Aggregated and already-filtered markers, one per barrio. */
  markers: readonly BarrioMarker[]
  /** Barrio highlighted from the side ranking (map flies to it). */
  selectedBarrio?: string | null
  onSelectBarrio?: (barrio: string) => void
  /** Which dataset is drawn: aggregated barrios or individual located reports. */
  layer?: 'barrios' | 'puntos'
  points?: readonly MapPoint[]
}

/**
 * Leaflet map on an OSM basemap desaturated via CSS (see mapa.css) (so severity colors are the loudest
 * thing on screen) centered on Valledupar. One CircleMarker per barrio: radius
 * grows with its report count, color follows its maximum severity.
 * It fills its parent, which must have a definite height.
 */
export default function MapaView({
  markers,
  selectedBarrio = null,
  onSelectBarrio,
  layer = 'barrios',
  points = [],
}: MapaViewProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const counts = markers.map((marker) => marker.count)
  const minCount = counts.length > 0 ? Math.min(...counts) : 0
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0

  useEffect(() => {
    if (map === null || selectedBarrio === null) {
      return
    }
    const target = markers.find((marker) => marker.barrio === selectedBarrio)
    if (target !== undefined) {
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.8 })
    }
    // Only fly when the selection changes, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarrio, map])

  return (
    <div className="h-full w-full">
      <MapContainer ref={setMap} center={VALLEDUPAR_CENTER} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {layer === 'puntos' &&
          points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                fillColor: severityColor(point.severity),
                fillOpacity: 0.92,
                weight: 2,
              }}
            >
              <Popup className="pulso-popup">
                <div className="min-w-[200px]">
                  <p className="font-display text-lg font-bold leading-tight text-slate-900">
                    {point.barrio}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {point.comuna}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <CategoryIcon category={point.category} className="h-4 w-4 text-slate-500" />
                    {CATEGORY_LABELS[point.category]}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Urgencia: <strong>{SEVERITY_LABELS[point.severity]}</strong>
                  </p>
                  <time dateTime={point.date} className="mt-1 block text-xs text-slate-500">
                    {new Date(point.date).toLocaleDateString('es-CO')}
                  </time>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        {layer === 'barrios' &&
          markers.map((marker) => {
          const isSelected = marker.barrio === selectedBarrio
          return (
            <CircleMarker
              key={marker.barrio}
              center={[marker.lat, marker.lng]}
              radius={radiusForCount(marker.count, minCount, maxCount) + (isSelected ? 4 : 0)}
              eventHandlers={{ click: () => onSelectBarrio?.(marker.barrio) }}
              pathOptions={{
                color: isSelected ? '#16264a' : '#ffffff',
                fillColor: severityColor(marker.maxSeverity),
                fillOpacity: 0.85,
                weight: isSelected ? 3 : 2,
              }}
            >
              <Popup className="pulso-popup">
                <div className="min-w-[220px]">
                  <p className="font-display text-xl font-bold leading-tight text-slate-900">
                    {marker.barrio}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {marker.comuna}
                  </p>
                  <p className="mt-3 flex items-baseline gap-1.5 border-t border-slate-200 pt-3">
                    <span className="font-display text-3xl font-bold tabular-nums text-slate-900">
                      {marker.count}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {marker.count === 1 ? 'reporte' : 'reportes'}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {breakdownByCategory(marker).map((entry) => (
                      <li
                        key={entry.category}
                        className="flex items-center justify-between gap-3 text-sm text-slate-600"
                      >
                        <span className="flex items-center gap-1.5">
                          <CategoryIcon category={entry.category} className="h-4 w-4 text-slate-500" />
                          {entry.label}
                        </span>
                        <span className="font-bold tabular-nums text-slate-900">{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
