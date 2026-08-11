interface ScoreItem {
  label: string
  pct: number
  weight: number
}

interface Props {
  overallScore: number
  scores: ScoreItem[]
}

function getScoreColor(pct: number) {
  if (pct >= 90) return { ring: 'text-green-600', bg: 'bg-green-500', label: 'Good' }
  if (pct >= 75) return { ring: 'text-amber-600', bg: 'bg-amber-500', label: 'Requires Attention' }
  return { ring: 'text-red-600', bg: 'bg-red-500', label: 'Inadequate' }
}

export function OfstedScoreCard({ overallScore, scores }: Props) {
  const color = getScoreColor(overallScore)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start gap-6 flex-wrap">
        {/* Big score */}
        <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-slate-100 shrink-0">
          <span className={`text-4xl font-bold ${color.ring}`}>{overallScore}</span>
          <span className="text-xs text-slate-500 mt-0.5">/ 100</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-lg font-bold text-slate-900">Ofsted / CQC Readiness Score</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              overallScore >= 90 ? 'bg-green-100 text-green-700' :
              overallScore >= 75 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {color.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Weighted composite across 5 compliance indicators. Target: 90+.
          </p>

          <div className="space-y-3">
            {scores.map(s => {
              const c = getScoreColor(s.pct)
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{s.label}</span>
                    <span className={`text-xs font-bold ${c.ring}`}>{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${c.bg}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
