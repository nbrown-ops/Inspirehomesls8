interface HomeOccupancy {
  id: string
  name: string
  capacity: number
  occupied: number
}

interface Props {
  homes: HomeOccupancy[]
}

export function OccupancyCard({ homes }: Props) {
  const totalCapacity = homes.reduce((s, h) => s + h.capacity, 0)
  const totalOccupied = homes.reduce((s, h) => s + h.occupied, 0)
  const overallPct    = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">Occupancy summary</h2>
      <p className="text-sm text-slate-500 mb-4">Current placements vs total registered capacity</p>

      <div className="flex items-end gap-4 mb-4">
        <span className="text-5xl font-bold text-purple-700">{overallPct}%</span>
        <span className="text-sm text-slate-500 mb-2">{totalOccupied} / {totalCapacity} places filled</span>
      </div>

      <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${overallPct}%` }} />
      </div>

      {homes.length > 1 && (
        <div className="space-y-2.5">
          {homes.map(h => {
            const pct = h.capacity > 0 ? Math.round((h.occupied / h.capacity) * 100) : 0
            return (
              <div key={h.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 truncate mr-3">{h.name}</span>
                  <span className="text-xs text-slate-500 shrink-0">{h.occupied}/{h.capacity}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-purple-400'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
