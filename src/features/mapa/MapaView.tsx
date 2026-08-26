import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getMapReports } from '../../lib/mockData'
import { aggregateByBarrio, radiusForCount, severityColor } from './mapUtils'

/** City center of Valledupar used as the initial map viewport. */
const VALLEDUPAR_CENTER: [number, number] = [10.46, -73.25]

/**
 * Leaflet map with OpenStreetMap tiles centered on Valledupar, rendering one
 * CircleMarker per barrio: the radius grows with its total report count and
 * the color is a criticality traffic light based on its maximum severity.
 * The wrapper has a fixed height: a MapContainer inside a zero-height box
 * renders an invisible map.
 */
export default function MapaView() {
  const markers = aggregateByBarrio(getMapReports())
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
          />
        ))}
      </MapContainer>
    </div>
  )
}
