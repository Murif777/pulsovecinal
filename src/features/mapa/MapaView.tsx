import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { BarrioMarker } from './mapUtils'
import { breakdownByCategory, radiusForCount, severityColor } from './mapUtils'

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
    <div className="h-[520px] w-full overflow-hidden rounded-xl border border-slate-200 shadow">
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
            <Popup>
              <div className="min-w-[180px] text-sm">
                <p className="font-semibold text-slate-900">{marker.barrio}</p>
                <p className="text-slate-500">{marker.comuna}</p>
                <p className="mt-1 text-slate-700">Total: {marker.count} reportes</p>
                <ul className="mt-1 space-y-0.5 text-slate-600">
                  {breakdownByCategory(marker).map((entry) => (
                    <li key={entry.category}>
                      {entry.label}: {entry.count}
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
