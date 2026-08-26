import { Link } from 'react-router-dom'

type IconProps = {
  className?: string
}

/* ── Inline SVG icons (Lucide-style strokes) ── */

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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
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

function ArrowRightIcon({ className }: IconProps) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

/* ── Feature cards data ── */

const FEATURES = [
  {
    to: '/encuesta',
    title: 'Encuestas',
    description: 'Registra las necesidades de tu barrio en minutos',
    icon: SurveyIcon,
    accent: 'teal' as const,
  },
  {
    to: '/mapa',
    title: 'Mapa interactivo',
    description: 'Visualiza la criticidad de cada barrio en Valledupar',
    icon: MapPinIcon,
    accent: 'emerald' as const,
  },
]

const ACCENT_STYLES = {
  teal: {
    tile: 'bg-teal-100 text-teal-700 group-hover:bg-teal-200',
    bar: 'from-teal-400 to-teal-600',
    link: 'text-teal-700 group-hover:text-teal-800',
  },
  emerald: {
    tile: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200',
    bar: 'from-emerald-400 to-emerald-600',
    link: 'text-emerald-700 group-hover:text-emerald-800',
  },
} as const

/* ── How-it-works steps ── */

const STEPS = [
  { num: '1', title: 'Encuesta casa a casa', description: 'Los vecinos reportan problemas de su barrio con su teléfono.' },
  { num: '2', title: 'Datos georreferenciados', description: 'Cada reporte se ubica en el mapa por barrio y comuna.' },
  { num: '3', title: 'Prioridades visibles', description: 'El dashboard muestra qué necesita atención primero.' },
]

/** Landing page for the root route ("/"). */
export default function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-sky-500">
        {/* Decorative ECG / pulse motif */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          aria-hidden="true"
          preserveAspectRatio="none"
          viewBox="0 0 1200 400"
        >
          <polyline
            points="0,200 100,200 150,200 200,80 250,320 300,160 350,240 400,200 500,200 550,200 600,100 650,300 700,180 750,220 800,200 900,200 950,200 1000,60 1050,340 1100,140 1150,260 1200,200"
            fill="none"
            stroke="white"
            strokeWidth={3}
          />
        </svg>

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            PulsoVecinal · Valledupar
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Toma el pulso a tu barrio
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/85">
            Encuestas ciudadanas georreferenciadas para priorizar las necesidades de los barrios de
            Valledupar. Tu voz importa.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/encuesta"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-lg shadow-teal-900/20 transition hover:bg-teal-50 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Registrar una encuesta
            </Link>
            <Link
              to="/mapa"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Ver el mapa
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {[
              { value: '15', label: 'barrios' },
              { value: '6', label: 'categorías' },
              { value: '6', label: 'comunas' },
            ].map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
              >
                <span className="font-bold">{stat.value}</span> {stat.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2
            id="features-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            ¿Qué puedes hacer?
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Dos formas de participar y mejorar tu comunidad
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {FEATURES.map((feature) => {
            const accent = ACCENT_STYLES[feature.accent]
            const Icon = feature.icon
            return (
              <Link
                key={feature.to}
                to={feature.to}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                {/* Top accent bar */}
                <span
                  className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`}
                  aria-hidden="true"
                />

                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${accent.tile}`}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{feature.description}</p>

                <span
                  className={`mt-4 inline-flex items-center gap-1 text-sm font-medium transition ${accent.link}`}
                >
                  Explorar <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section aria-labelledby="how-heading" className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2
            id="how-heading"
            className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            ¿Cómo funciona?
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {step.num}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
