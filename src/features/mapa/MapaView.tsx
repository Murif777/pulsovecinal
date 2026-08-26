import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/** City center of Valledupar used as the initial map viewport. */
const VALLEDUPAR_CENTER: [number, number] = [10.46, -73.25]

/**
 * Base Leaflet map with OpenStreetMap tiles centered on Valledupar.
 * The wrapper has a fixed height: a MapContainer inside a zero-height box
 * renders an invisible map.
 */
export default function MapaView() {
  return (
    <div className="h-[520px] w-full overflow-hidden rounded-xl border border-slate-200 shadow">
      <MapContainer center={VALLEDUPAR_CENTER} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  )
}
