import type { ReactNode } from 'react'
import { useState } from 'react'

type PanelSectionProps = {
  title: string
  /** Count of selected values; omitted when the section is not a multi-select. */
  count?: number
  /** Whether the section starts expanded. */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Collapsible block of the control panel. The optional count badge shows how
 * many values are selected in a multi-select group.
 */
export default function PanelSection({ title, count, defaultOpen = true, children }: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-slate-200 py-3 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <span className="inline-flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
              {count}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </section>
  )
}
