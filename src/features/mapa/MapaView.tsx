import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { BarrioMarker } from './mapUtils'
import { breakdownByCategory, CATEGORY_ICONS, radiusForCount, severityColor } from './mapUtils'
import './mapa.css'

/** City center of Valledupar used as the initial map viewport. */
const VALLEDUPAR_CENTER: [number, number] = [10.46, -73.25]

type MapaViewProps = {
  /** Aggregated and already-filtered markers, one per barrio. */
  markers: readonly BarrioMarker[]
}

/**
 * Leaflet map with OpenStreetMap tiles centered on Valledupar, rendering one
 * CircleMarker per barrio: the radius grows with its total report count and
 * the color is a criticality traffic light based on its maximum severity.
 * Purely presentational: it receives the markers ready to render.
 * The wrapper has a fixed height: a MapContainer inside a zero-height box
 * renders an invisible map.
 */
export default function MapaView({ markers }: MapaViewProps) {
  const counts = markers.map((marker) => marker.count)
  const minCount = counts.length > 0 ? Math.min(...counts) : 0
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 sm:h-[560px]">
      <MapContainer center={VALLEDUPAR_CENTER} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <CircleMarker
            key={marker.barrio}
            center={[marker.lat, marker.lng]}
            radius={radiusForCount(marker.count, minCount, maxCount)}
            pathOptions={{
              color: severityColor(marker.maxSeverity),
              fillColor: severityColor(marker.maxSeverity),
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup className="pulso-popup">
              <div className="min-w-[200px]">
                <p className="text-base font-bold leading-tight text-slate-900">{marker.barrio}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {marker.comuna}
                </p>
                <p className="mt-2 rounded-lg bg-teal-50 px-2.5 py-1.5 text-sm font-semibold text-teal-800">
                  Total: {marker.count} {marker.count === 1 ? 'reporte' : 'reportes'}
                </p>
                <ul className="mt-2 space-y-1">
                  {breakdownByCategory(marker).map((entry) => (
                    <li
                      key={entry.category}
                      className="flex items-center justify-between gap-3 text-sm text-slate-600"
                    >
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true">{CATEGORY_ICONS[entry.category]}</span>
                        {entry.label}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
