type EmptyStateProps = {
  onClear: () => void
}

/**
 * Shown when the active filters leave the dashboard with zero responses.
 */
export default function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div role="status" className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
      <div className="max-w-sm">
        <h2 className="font-display text-2xl font-bold text-slate-900">No hay reportes con esos filtros</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Prueba con otra combinación de comuna, categoría, severidad o periodo.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}
