type PlaceholderPageProps = {
  /** Page title rendered as the main heading. */
  title: string
  /** Two-to-three line description of what the feature will do. */
  description: string
}

/**
 * Shared layout for feature placeholder pages (Slice 4).
 * Gives every team an identical, visually consistent starting point so each
 * member only edits their own folder under src/features/<feature>/.
 */
export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
          🚧 En construcción
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{description}</p>
        <p className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
          Feature asignada — cada integrante desarrolla su módulo dentro de{' '}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700">
            src/features/&lt;feature&gt;/
          </code>{' '}
          siguiendo el flujo Trunk-Based descrito en el README.
        </p>
      </div>
    </section>
  )
}
