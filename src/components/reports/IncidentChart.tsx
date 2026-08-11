interface Props {
  breakdown: [string, number][]
  totalCount: number
}

const TYPE_LABELS: Record<string, string> = {
  physical_aggression: 'Physical aggression',
  self_harm:           'Self-harm',
  verbal_aggression:   'Verbal aggression',
  missing_person:      'Missing person',
  medication_error:    'Medication error',
  property_damage:     'Property damage',
  accident:            'Accident / injury',
  fire:                'Fire',
  safeguarding:        'Safeguarding',
  other:               'Other',
}

const BAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500',
]

export function IncidentChart({ breakdown, totalCount }: Props) {
  const max = breakdown[0]?.[1] ?? 1

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Incident frequency — last 3 months</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} total incident{totalCount !== 1 ? 's' : ''} recorded</p>
        </div>
        {totalCount === 0 && (
          <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">No incidents</span>
        )}
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No incidents in the last 3 months.</p>
      ) : (
        <div className="space-y-3">
          {breakdown.map(([type, count], i) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-44 shrink-0 truncate">
                {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
