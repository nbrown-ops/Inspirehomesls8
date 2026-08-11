import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Flag, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatTimeAgo } from '@/lib/utils/dates'
import { subDays, formatISO } from 'date-fns'

const TYPE_LABELS: Record<string, string> = {
  general:          'General',
  behaviour:        'Behaviour',
  welfare:          'Welfare check',
  medication:       'Medication',
  health:           'Health',
  education:        'Education',
  activity:         'Activity',
  communication:    'Communication',
  personal_care:    'Personal care',
  other:            'Other',
}

export default async function DailyLogsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const ago7 = formatISO(subDays(new Date(), 7))

  const { data: logs } = await supabase
    .from('daily_logs')
    .select(`
      id, log_type, entry, mood_rating, is_flagged, flagged_reason,
      created_at, shift_id,
      service_user:service_users!service_user_id(id, first_name, last_name),
      written_by:profiles!written_by(full_name),
      home:homes!home_id(name)
    `)
    .gte('created_at', ago7)
    .order('created_at', { ascending: false })
    .limit(100)

  const flagged = logs?.filter(l => l.is_flagged) ?? []
  const normal  = logs?.filter(l => !l.is_flagged) ?? []

  const MOOD_COLORS = ['', 'bg-red-200', 'bg-orange-200', 'bg-amber-200', 'bg-yellow-200', 'bg-lime-200', 'bg-green-200']
  const MOOD_LABELS = ['', '1 – Very low', '2 – Low', '3 – Below average', '4 – Average', '5 – Good', '6 – Very good']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Last 7 days &middot; {logs?.length ?? 0} entries &middot; {flagged.length} flagged
          </p>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-700">Flagged entries ({flagged.length})</p>
          </div>
          <div className="space-y-2">
            {flagged.map(log => {
              const su = log.service_user as unknown as { id: string; first_name: string; last_name: string } | null
              return (
                <div key={log.id} className="bg-white border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {su ? <Link href={`/residents/${su.id}`} className="hover:text-purple-700">{su.first_name} {su.last_name}</Link> : 'No resident'}
                      </p>
                      {log.flagged_reason && (
                        <p className="text-sm text-red-700 mt-1">{log.flagged_reason}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{(log.written_by as unknown as { full_name: string } | null)?.full_name} · {formatTimeAgo(log.created_at)}</p>
                    </div>
                    <Badge variant="danger">Flagged</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Log feed */}
      <div className="space-y-2">
        {normal.map(log => {
          const su   = log.service_user as unknown as { id: string; first_name: string; last_name: string } | null
          const mood = typeof log.mood_rating === 'number' ? log.mood_rating : null
          return (
            <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {su ? (
                      <Link href={`/residents/${su.id}`} className="text-sm font-semibold text-slate-900 hover:text-purple-700">
                        {su.first_name} {su.last_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">General</p>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {TYPE_LABELS[log.log_type] ?? log.log_type}
                    </span>
                    {mood !== null && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MOOD_COLORS[mood] ?? ''}`}>
                        Mood {mood}/6
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-2 line-clamp-3">{log.entry}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(log.written_by as unknown as { full_name: string } | null)?.full_name ?? '—'}
                    {(log.home as unknown as { name: string } | null)?.name ? ` · ${(log.home as unknown as { name: string }).name}` : ''}
                    {log.shift_id ? (
                      <Link href={`/shifts/${log.shift_id}`} className="ml-1 text-purple-500 hover:underline">
                        View shift
                      </Link>
                    ) : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-400 shrink-0">{formatTimeAgo(log.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {!logs?.length && (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No daily logs in the last 7 days</p>
          <p className="text-sm mt-1">Logs are added during shifts.</p>
        </div>
      )}
    </div>
  )
}
