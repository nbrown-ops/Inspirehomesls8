'use client'

import { Printer } from 'lucide-react'

interface Props {
  className?: string
  label?: string
}

export function PrintButton({ className = '', label = 'Print / Export PDF' }: Props) {
  return (
    <button
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors print:hidden ${className}`}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  )
}
