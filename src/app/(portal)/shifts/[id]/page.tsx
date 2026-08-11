import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, LogOut, ClipboardList, CheckCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DailyLogModal } from '@/components/shifts/DailyLogModal'
import { addDailyLogAction, clockOutAction } from '../actions'
import { formatDateTime } from '@/lib/utils/dates'

interface Props { params: { id: string } }

export default async function ActiveShiftPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load shift with staff + home
  const { data: shift } = await supabase
    .from('shifts')
    .select(`
      id, shift_type, start_time, end_time, notes, concerns,
      staff:profiles!staff_id(id, full_name, photo_url),
      home:homes!home_id(id, name, address, city, postcode)
    `)
    .eq('id', params.id)
    .single()

  if (!shift) notFound()

  const home   = shift.home as unknown as { id: string; name: string; address: string; city: string; postcode: string }
  const isOwner = (shift.staff as unknown as { id: string }).id === user.id

  // Active residents at this property
  const { data: residents } = await supabase
    .from('service_users')
    .select('id, first_name, last_name, preferred_name, date_of_birth, photo_url, allergies')
    .eq('home_id', home.id)
    .eq('status', 'active')
    .order('last_name')

  // Daily logs already written for this shift
  const { data: existingLogs } = await supabase
    .from('daily_logs')
    .select('id, service_user_id, mood_rating, concerns, is_flagged')
    .eq('shift_id', params.id)

  // Handover (if submitted)
  const { data: handover } = await supabase
    .from('handover_notes')
    .select('id, summary, is_acknowledged, handover_time')
    .eq('outgoing_shift_id', params.id)
    .single()

  const logMap = new Map((existingLogs ?? []).map(l => [l.service_user_id, l]))
  const allLogged = (residents ?? []).every(r => logMap.has(r.id))
  const isClosed  = !!shift.end_time

  const SHIFT_LABELS: Record<string, string> = {
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
    night: 'Night', waking_night: 'Waking Night', sleep_in: 'Sleep-In',
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/shifts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Shift dashboard
      </Link>

      {/* Shift header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className={`h-2 ${isClosed ? 'bg-slate-300' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`} />
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {(shift.staff as unknown as { photo_url?: string | null; full_name: string }).photo_url ? (
                <img
                  src={(shift.staff as unknown as { photo_url: string }).photo_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-xl">
                  {(shift.staff as unknown as { full_name: string }).full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {(shift.staff as unknown as { full_name: string }).full_name}
                </h1>
                <p className="text-slate-500 text-sm">{home.name} &middot; {SHIFT_LABELS[shift.shift_type] ?? shift.shift_type}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Started {formatDateTime(shift.start_time)}
                  {shift.end_time && ` · Ended ${formatDateTime(shift.end_time)}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isClosed ? 'default' : 'success'}>
                {isClosed ? 'Completed' : 'Active'}
              </Badge>
              <Badge variant="default">
                {logMap.size}/{residents?.length ?? 0} logs written
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Handover banner — if incoming staff has an unacknowledged handover */}
      {handover && (
        <div className={`rounded-xl border p-5 ${handover.is_acknowledged ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            {handover.is_acknowledged
              ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              : <ClipboardList className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-semibold text-sm ${handover.is_acknowledged ? 'text-green-800' : 'text-amber-800'}`}>
                {handover.is_acknowledged ? 'Handover acknowledged' : 'Handover submitted — awaiting acknowledgement'}
              </p>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{handover.summary}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDateTime(handover.handover_time)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily logs section */}
      {!isClosed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Daily logs</h2>
              <p className="text-sm text-slate-500">Complete a log entry for each resident present on this shift.</p>
            </div>
            {allLogged && residents && residents.length > 0 && (
              <Badge variant="success">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                All logs complete
              </Badge>
            )}
          </div>

          {residents && residents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {residents.map(r => (
                <DailyLogModal
                  key={r.id}
                  resident={r}
                  shiftId={params.id}
                  homeId={home.id}
                  action={addDailyLogAction}
                  existingLog={logMap.get(r.id) ?? null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No active residents at this property.</p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isClosed && isOwner && (
        <div className="flex flex-wrap gap-3 pt-2">
          {!handover ? (
            <Button asChild className="bg-purple-700 hover:bg-purple-800">
              <Link href={`/shifts/${params.id}/handover`}>
                <ClipboardList className="h-4 w-4" />
                Write handover &amp; clock out
              </Link>
            </Button>
          ) : (
            <ClockOutButton shiftId={params.id} />
          )}
        </div>
      )}
    </div>
  )
}

// Server-action clock-out button (client component)
function ClockOutButton({ shiftId }: { shiftId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await clockOutAction(shiftId)
      }}
    >
      <Button type="submit" variant="secondary">
        <LogOut className="h-4 w-4" />
        Clock out
      </Button>
    </form>
  )
}
