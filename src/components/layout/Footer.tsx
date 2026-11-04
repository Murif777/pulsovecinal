import { Link } from 'react-router-dom'

/** Pie editorial: marca, contexto academico y ano. */
export default function Footer() {
  return (
    <footer className="bg-brand-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-display text-2xl font-bold text-paper">
            Pulso<span className="text-pulse-400">Vecinal</span>
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            Proyecto académico de encuestas ciudadanas georreferenciadas para los barrios de
            Valledupar, Colombia.
          </p>
        </div>
        <div className="text-sm md:text-right">
          <Link
            to="/legal"
            className="font-semibold text-paper underline underline-offset-4 hover:text-pulse-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Política de datos y consentimiento
          </Link>
          <p className="mt-3 text-slate-500">© {new Date().getFullYear()} PulsoVecinal</p>
        </div>
      </div>
    </footer>
  )
}
