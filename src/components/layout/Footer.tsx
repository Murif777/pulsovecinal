/** Site-wide footer: project name, academic context line and current year. */
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm sm:px-6">
        <p className="font-semibold text-slate-900">PulsoVecinal</p>
        <p className="text-slate-600">
          Proyecto académico de encuestas ciudadanas georreferenciadas para los barrios de
          Valledupar, Colombia.
        </p>
        <p className="text-slate-500">© {new Date().getFullYear()} PulsoVecinal</p>
      </div>
    </footer>
  )
}
