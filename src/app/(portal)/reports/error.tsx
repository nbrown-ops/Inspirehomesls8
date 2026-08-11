'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Reports page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Reports unavailable</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Could not load report data. This is usually a temporary connectivity issue — please try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-purple-700 text-white text-sm font-medium rounded-lg hover:bg-purple-800 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
