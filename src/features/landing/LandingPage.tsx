import { Link } from 'react-router-dom'

type IconProps = {
  className?: string
}

/** Simple inline SVG icons (Lucide-style strokes) — no icon library needed. */
function SurveyIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  )
}

function MapPinIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BarChartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M8 17v-3" />
      <path d="M13 17V7" />
      <path d="M18 17v-8" />
    </svg>
  )
}

const FEATURES = [
  {
    to: '/encuesta',
    title: 'Encuestas',
    description: 'Reporta las necesidades de tu barrio y califica qué tan urgente es cada problema.',
    icon: <SurveyIcon className="h-6 w-6" />,
  },
  {
    to: '/mapa',
    title: 'Mapa interactivo',
    description: 'Explora en el mapa de Valledupar dónde se concentran los reportes de la comunidad.',
    icon: <MapPinIcon className="h-6 w-6" />,
  },
  {
    to: '/dashboard',
    title: 'Dashboard',
    description: 'Consulta resúmenes y prioridades por comuna para apoyar las decisiones del barrio.',
    icon: <BarChartIcon className="h-6 w-6" />,
  },
]

/** Landing page for the root route ("/"). */
export default function LandingPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-teal-50/70 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-700">
            Valledupar · Colombia
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Toma el pulso a tu barrio
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            PulsoVecinal es una plataforma de encuestas ciudadanas que permite reportar, visualizar y
            priorizar las necesidades de los barrios de Valledupar, para que la voz de la comunidad
            oriente las decisiones.
          </p>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <h2
          id="features-heading"
          className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Tres formas de participar
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-100"
                aria-hidden="true"
              >
                {feature.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
