import MapaView from './MapaView'

/** /mapa page: interactive criticality map of Valledupar barrios. */
export default function MapaPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Mapa interactivo
      </h1>
      <p className="mt-2 leading-7 text-slate-600">Criticidad por barrio — Valledupar</p>
      <div className="mt-6">
        <MapaView />
      </div>
    </section>
  )
}
