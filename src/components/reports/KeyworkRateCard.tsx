interface Props {
  rate: number
  count: number
  total: number
}

export function KeyworkRateCard({ rate, count, total }: Props) {
  const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'
  const barColor = rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">Keywork contact rate</h2>
      <p className="text-sm text-slate-500 mb-4">Service users who had a recorded keywork session in the last 7 days</p>

      <div className="flex items-end gap-4 mb-4">
        <span className={`text-5xl font-bold ${color}`}>{rate}%</span>
        <span className="text-sm text-slate-500 mb-2">{count} of {total} residents</span>
      </div>

      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
      </div>

      {rate < 80 && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
          Target is 80%+ weekly keywork contact. {total - count} resident{total - count !== 1 ? 's' : ''} without a session this week.
        </p>
      )}
    </div>
  )
}
