import Link from 'next/link'
import { Plus, AlertTriangle, CheckCircle, Clock, ClipboardList, Flag, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatTimeAgo } from '@/lib/utils/dates'
import { HandoverAcknowledgeButton } from '@/components/shifts/HandoverAcknowledgeButton'

const SHIFT_LABELS: Record<string, { label: string; color: string }> = {
  morning:      { label: 'Morning Start',  color: 'bg-amber-100 text-amber-700'   },
  evening:      { label: 'Evening Start',  color: 'bg-indigo-100 text-indigo-700' },
  waking_night: { label: 'Waking Night',   color: 'bg-purple-100 text-purple-700' },
  sleep_in:     { label: 'Sleep-In',       color: 'bg-blue-100 text-blue-700'     },
  // Legacy values — kept so historical records display correctly
  afternoon:    { label: 'Afternoon',      color: 'bg-orange-100 text-orange-700' },
  night:        { label: 'Night',          color: 'bg-slate-200 text-slate-700'   },
}

export default async function ShiftsDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = myProfile?.role === 'super_admin' || myProfile?.role === 'manager'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // My active shift (for staff)
  const { data: myActiveShift } = await supabase
    .from('shifts')
    .select('id, shift_type, start_time, home:homes!home_id(name)')
    .eq('staff_id', user.id)
    .is('end_time', null)
    .single()

  // Unacknowledged handovers for the current user
  const { data: pendingHandovers } = await supabase
    .from('handover_notes')
    .select(`
      id, summary, handover_time, urgent_actions,
      outgoing_staff:profiles!outgoing_staff_id(full_name),
      home:homes!home_id(name)
    `)
    .eq('incoming_staff_id', user.id)
    .eq('is_acknowledged', false)

  // ── Manager-only data ──────────────────────────────────────────────────────

  // All active shifts today (managers see all their properties)
  const { data: activeShifts } = isManager ? await supabase
    .from('shifts')
    .select(`
      id, shift_type, start_time,
      staff:profiles!staff_id(id, full_name, photo_url),
      home:homes!home_id(id, name)
    `)
    .is('end_time', null)
    .gte('start_time', today.toISOString())
    .order('start_time') : { data: [] }

  // All unacknowledged handovers (managers see all)
  const { data: allHandovers } = isManager ? await supabase
    .from('handover_notes')
    .select(`
      id, summary, handover_time,
      outgoing_staff:profiles!outgoing_staff_id(full_name),
      incoming_staff:profiles!incoming_staff_id(full_name),
      home:homes!home_id(name)
    `)
    .eq('is_acknowledged', false)
    .order('handover_time', { ascending: false }) : { data: [] }

  // Flagged daily log entries from last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: flaggedLogs } = isManager ? await supabase
    .from('daily_logs')
    .select(`
      id, flagged_reason, created_at, shift_id,
      service_user:service_users!service_user_id(first_name, last_name),
      written_by:profiles!written_by(full_name)
    `)
    .eq('is_flagged', true)
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false }) : { data: [] }

  // Group active shifts by home (for coverage grid)
  const coverageByHome = new Map<string, { homeName: string; shifts: any[] }>()
  for (const shift of activeShifts ?? []) {
    const homeObj = shift.home as unknown as { id: string; name: string }
    if (!coverageByHome.has(homeObj.id)) {
      coverageByHome.set(homeObj.id, { homeName: homeObj.name, shifts: [] })
    }
    coverageByHome.get(homeObj.id)!.shifts!.push(shift)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shifts</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isManager ? 'Coverage overview across all properties' : 'Your shifts and handovers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/shifts/schedule">
              <LayoutGrid className="h-4 w-4" />
              Schedule
            </Link>
          </Button>
          {!myActiveShift && (
            <Button asChild className="bg-purple-700 hover:bg-purple-800">
              <Link href="/shifts/new">
                <Plus className="h-4 w-4" />
                Clock in
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* My active shift banner */}
      {myActiveShift && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            <div>
              <p className="font-semibold text-purple-900">You&apos;re currently on shift</p>
              <p className="text-sm text-purple-600">
                {(myActiveShift.home as unknown as { name: string }).name} &middot;{' '}
                {SHIFT_LABELS[myActiveShift.shift_type]?.label ?? myActiveShift.shift_type} &middot;{' '}
                Started {formatDateTime(myActiveShift.start_time)}
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/shifts/${myActiveShift.id}`}>View shift</Link>
          </Button>
        </div>
      )}

      {/* Pending handovers for current user */}
      {pendingHandovers && pendingHandovers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Handovers awaiting your acknowledgement</h2>
            <Badge variant="warning">{pendingHandovers.length}</Badge>
          </div>
          <div className="space-y-3">
            {pendingHandovers.map(h => (
              <div key={h.id} className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-amber-900 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Handover from {(h.outgoing_staff as unknown as { full_name: string }).full_name}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {(h.home as unknown as { name: string }).name} &middot; {formatTimeAgo(h.handover_time)}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 line-clamp-3">{h.summary}</p>
                    {h.urgent_actions && (
                      <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-semibold text-red-700 mb-1">Urgent actions:</p>
                        <p className="text-sm text-red-800">{h.urgent_actions}</p>
                      </div>
                    )}
                  </div>
                  <HandoverAcknowledgeButton handoverId={h.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manager: coverage grid */}
      {isManager && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Live shift coverage</h2>
            <Badge variant="success">{activeShifts?.length ?? 0} active</Badge>
          </div>

          {coverageByHome.size > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(coverageByHome.entries()).map(([homeId, { homeName, shifts }]) => (
                <div key={homeId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="font-semibold text-sm text-slate-900">{homeName}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(shifts ?? []).map(s => {
                      const shiftConfig = SHIFT_LABELS[s.shift_type] ?? { label: s.shift_type, color: 'bg-slate-100 text-slate-600' }
                      return (
                        <Link
                          key={s.id}
                          href={`/shifts/${s.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          {(s.staff as unknown as { photo_url?: string | null; full_name: string }).photo_url ? (
                            <img
                              src={(s.staff as unknown as { photo_url: string }).photo_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                              {(s.staff as unknown as { full_name: string }).full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {(s.staff as unknown as { full_name: string }).full_name}
                            </p>
                            <p className="text-xs text-slate-400">{formatDateTime(s.start_time)}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${shiftConfig.color}`}>
                            {shiftConfig.label}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Clock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No active shifts right now</p>
            </div>
          )}
        </section>
      )}

      {/* Manager: unacknowledged handovers (all properties) */}
      {isManager && allHandovers && allHandovers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Unacknowledged handovers</h2>
            <Badge variant="warning">{allHandovers.length}</Badge>
          </div>
          <div className="space-y-2">
            {allHandovers.map(h => (
              <div key={h.id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {(h.home as unknown as { name: string }).name} &middot;{' '}
                    {(h.outgoing_staff as unknown as { full_name: string }).full_name}
                    {(h.incoming_staff as unknown as { full_name: string } | null) &&
                      ` → ${(h.incoming_staff as unknown as { full_name: string }).full_name}`
                    }
                  </p>
                  <p className="text-xs text-slate-400">{formatTimeAgo(h.handover_time)}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-1">{h.summary}</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manager: flagged daily log entries */}
      {isManager && flaggedLogs && flaggedLogs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flag className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-700">Flagged entries — last 24 hours</h2>
            <Badge variant="danger">{flaggedLogs.length}</Badge>
          </div>
          <div className="space-y-2">
            {flaggedLogs.map(log => {
              const su = log.service_user as unknown as { first_name: string; last_name: string } | null
              return (
                <Link
                  key={log.id}
                  href={`/shifts/${log.shift_id}`}
                  className="block bg-white rounded-xl border border-red-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 text-red-500" />
                        {su ? `${su.first_name} ${su.last_name}` : 'Unknown resident'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Written by {(log.written_by as unknown as { full_name: string } | null)?.full_name ?? '—'} &middot; {formatTimeAgo(log.created_at)}
                      </p>
                      {log.flagged_reason && (
                        <p className="text-sm text-red-700 mt-1">{log.flagged_reason}</p>
                      )}
                    </div>
                    <Badge variant="danger">Flagged</Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Staff: recent shifts */}
      {!isManager && (
        <RecentShiftsSection userId={user.id} />
      )}
    </div>
  )
}

// Async sub-component for staff's recent shifts
async function RecentShiftsSection({ userId }: { userId: string }) {
  const supabase = createClient()
  const { data: recentShifts } = await supabase
    .from('shifts')
    .select(`
      id, shift_type, start_time, end_time,
      home:homes!home_id(name)
    `)
    .eq('staff_id', userId)
    .order('start_time', { ascending: false })
    .limit(10)

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Your recent shifts</h2>
      {recentShifts && recentShifts.length > 0 ? (
        <div className="space-y-2">
          {recentShifts.map(s => {
            const shiftConfig = SHIFT_LABELS[s.shift_type] ?? { label: s.shift_type, color: 'bg-slate-100 text-slate-600' }
            return (
              <Link
                key={s.id}
                href={`/shifts/${s.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {(s.home as unknown as { name: string }).name}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(s.start_time)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${shiftConfig.color}`}>
                  {shiftConfig.label}
                </span>
                {s.end_time ? (
                  <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No recent shifts found.</p>
      )}
    </section>
  )
}
