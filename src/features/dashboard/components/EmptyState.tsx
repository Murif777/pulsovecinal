type EmptyStateProps = {
  onClear: () => void
}

/**
 * Shown when the active filters leave the dashboard with zero responses.
 */
export default function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div role="status" className="flex min-h-[18rem] items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="max-w-sm">
        <span aria-hidden="true" className="text-4xl">
          🔍
        </span>
        <h2 className="mt-3 text-lg font-bold text-slate-900">No hay reportes con esos filtros</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Prueba con otra combinación de comuna, categoría, severidad o periodo.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}
