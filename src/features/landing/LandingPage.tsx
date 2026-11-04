import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import type { IconName } from '../../components/Icon'

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

/* ── Datos ── */

const FEATURES = [
  {
    to: '/participa',
    title: 'Participa',
    description: 'Registra las necesidades de tu barrio en minutos, desde el celular.',
    icon: SurveyIcon,
  },
  {
    to: '/reportes-en-vivo',
    title: 'Reportes en vivo',
    description: 'Visualiza la criticidad de cada barrio de Valledupar, comuna por comuna.',
    icon: MapPinIcon,
  },
]

const STEPS: readonly { icon: IconName; title: string; description: string }[] = [
  { icon: 'pen', title: 'Encuesta casa a casa', description: 'Los vecinos reportan problemas de su barrio con su teléfono.' },
  { icon: 'pin', title: 'Datos georreferenciados', description: 'Cada reporte se ubica en el mapa por barrio y comuna.' },
  { icon: 'chart', title: 'Prioridades visibles', description: 'El dashboard muestra qué necesita atención primero.' },
]

const STATS = [
  { value: '15', label: 'barrios' },
  { value: '6', label: 'categorías' },
  { value: '6', label: 'comunas' },
]

/** Landing page for the root route ("/"). */
export default function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-brand-950 text-paper">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-pulse-500/25 blur-3xl"
          aria-hidden="true"
        />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-pulse-400"
          aria-hidden="true"
          preserveAspectRatio="none"
          viewBox="0 0 1200 160"
        >
          <polyline
            className="ecg-line"
            points="0,100 220,100 260,100 300,30 340,150 380,70 420,110 460,100 700,100 740,100 780,20 820,150 860,80 900,105 940,100 1200,100"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-32 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <h1 className="rise-2 text-5xl font-bold leading-[1.02] text-paper sm:text-6xl lg:text-7xl">
              Toma el pulso a tu barrio
            </h1>
            <p className="rise-3 mt-6 max-w-xl text-lg leading-8 text-brand-100/80">
              Encuestas ciudadanas georreferenciadas para priorizar las necesidades de los barrios de
              Valledupar.
            </p>
            <div className="rise-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/participa"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-pulse-600 px-7 py-3.5 text-sm font-bold text-white shadow-lift transition hover:bg-pulse-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Registrar una encuesta
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                to="/reportes-en-vivo"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-paper/30 px-7 py-3.5 text-sm font-bold text-paper transition hover:border-paper hover:bg-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver reportes en vivo
              </Link>
            </div>
          </div>

          <dl className="rise-3 grid grid-cols-3 divide-x divide-paper/15 rounded-2xl border border-paper/15 bg-paper/[0.04] backdrop-blur-sm">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 py-6 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-4xl font-bold tabular-nums text-paper">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-brand-200/70">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Que puedes hacer ── */}
      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-xl">
          <h2 id="features-heading" className=" text-4xl font-bold text-slate-900 sm:text-5xl">
            ¿Qué puedes hacer?
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Reporta un problema o mira cómo está tu barrio.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                key={feature.to}
                to={feature.to}
                className="group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-pulse-400"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="relative mt-10">
                  <h3 className="font-display text-2xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{feature.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition-all group-hover:gap-3">
                    Explorar <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section aria-labelledby="how-heading" className="border-y border-slate-200 bg-slate-100/70">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <h2 id="how-heading" className=" text-4xl font-bold text-slate-900 sm:text-5xl">
            ¿Cómo funciona?
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <li key={step.title} className="relative border-t-2 border-slate-900 pt-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pulse-600 text-white">
                  <Icon name={step.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
