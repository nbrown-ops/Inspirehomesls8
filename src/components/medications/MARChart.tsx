'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/dates'
import { LogMARModal, type MAREntry } from './LogMARModal'

interface Props {
  medicationId: string
  serviceUserId: string
  defaultDose: string
  initialEntries: MAREntry[]
  canWrite: boolean
}

const OUTCOME_STYLE: Record<string, string> = {
  given:            'bg-green-100 text-green-700',
  refused:          'bg-red-100 text-red-700',
  missed:           'bg-amber-100 text-amber-700',
  self_administered:'bg-blue-100 text-blue-700',
}

export function MARChart({ medicationId, serviceUserId, defaultDose, initialEntries, canWrite }: Props) {
  const [entries, setEntries] = useState<MAREntry[]>(initialEntries)

  function handleLogged(entry: MAREntry) {
    setEntries(prev => [entry, ...prev])
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> MAR Chart ({entries.length} entries)
        </p>
        {canWrite && (
          <LogMARModal
            medicationId={medicationId}
            serviceUserId={serviceUserId}
            defaultDose={defaultDose}
            onLogged={handleLogged}
          />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400 italic">No MAR entries recorded yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {entries.slice(0, 50).map(entry => (
            <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-900">{formatDateTime(entry.administered_at)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {entry.administered_by?.full_name ?? 'Unknown'}
                  {entry.notes ? ` · ${entry.notes}` : ''}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${OUTCOME_STYLE[entry.outcome] ?? 'bg-slate-100 text-slate-600'}`}>
                {entry.outcome.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
