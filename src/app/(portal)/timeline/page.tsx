import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatTimeAgo } from '@/lib/utils/dates'
import { subDays, formatISO } from 'date-fns'

const TYPE_LABELS: Record<string, string> = {
  key_work_session:     'Key Work Session',
  welfare_check:        'Welfare Check',
  medication_prompt:    'Medication Prompt',
  activity:             'Activity',
  community_activity:   'Community Activity',
  appointment:          'Appointment',
  medical_appointment:  'Medical Appointment',
  phone_call:           'Phone Call',
  visit:                'Visit',
  incident:             'Incident',
  handover:             'Handover',
  safeguarding_concern: 'Safeguarding',
  positive_achievement: 'Positive Achievement',
  other:                'Other',
}

const TYPE_COLOR: Record<string, string> = {
  key_work_session:     'bg-purple-100 text-purple-700',
  welfare_check:        'bg-blue-100 text-blue-700',
  medication_prompt:    'bg-green-100 text-green-700',
  safeguarding_concern: 'bg-red-100 text-red-700',
  incident:             'bg-red-100 text-red-700',
  positive_achievement: 'bg-emerald-100 text-emerald-700',
  appointment:          'bg-indigo-100 text-indigo-700',
  medical_appointment:  'bg-indigo-100 text-indigo-700',
}

export default async function TimelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ago7 = formatISO(subDays(new Date(), 7))

  const { data: entries } = await supabase
    .from('interaction_timeline')
    .select(`
      id, interaction_type, occurred_at, notes, outcome, duration_minutes,
      is_flagged, flagged_reason,
      service_user:service_users!service_user_id(id, first_name, last_name),
      staff:profiles!staff_id(full_name),
      home:homes!home_id(name)
    `)
    .gte('occurred_at', ago7)
    .order('occurred_at', { ascending: false })
    .limit(150)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interaction Timeline</h1>
        <p className="mt-1 text-sm text-slate-500">
          All interactions across all residents — last 7 days &middot; {entries?.length ?? 0} entries
        </p>
      </div>

      {!entries?.length ? (
        <div className="text-center py-20 text-slate-400">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No interactions in the last 7 days</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-3 pl-10">
            {entries.map(entry => {
              const su    = entry.service_user as unknown as { id: string; first_name: string; last_name: string } | null
              const staff = entry.staff as unknown as { full_name: string } | null
              const type  = entry.interaction_type
              const color = TYPE_COLOR[type] ?? 'bg-slate-100 text-slate-600'

              return (
                <div key={entry.id} className="relative">
                  {/* Dot */}
                  <div className={`absolute -left-[2.4rem] top-3.5 w-3 h-3 rounded-full border-2 border-white ${entry.is_flagged ? 'bg-red-500' : 'bg-purple-400'}`} />

                  <div className={`bg-white rounded-xl border p-4 ${entry.is_flagged ? 'border-red-200' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                            {TYPE_LABELS[type] ?? type}
                          </span>
                          {entry.is_flagged && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Flagged</span>
                          )}
                          {entry.duration_minutes && (
                            <span className="text-xs text-slate-400">{entry.duration_minutes} min</span>
                          )}
                        </div>

                        {su && (
                          <Link href={`/residents/${su.id}`} className="text-sm font-semibold text-slate-900 hover:text-purple-700">
                            {su.first_name} {su.last_name}
                          </Link>
                        )}

                        {entry.notes && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{entry.notes}</p>
                        )}

                        {entry.is_flagged && entry.flagged_reason && (
                          <p className="text-sm text-red-700 mt-1">{entry.flagged_reason}</p>
                        )}

                        {entry.outcome && (
                          <p className="text-xs text-slate-400 mt-1">Outcome: {entry.outcome}</p>
                        )}

                        <p className="text-xs text-slate-400 mt-1">
                          {staff?.full_name ?? '—'}
                          {(entry.home as unknown as { name: string } | null)?.name ? ` · ${(entry.home as unknown as { name: string }).name}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">{formatTimeAgo(entry.occurred_at)}</p>
                        <p className="text-xs text-slate-300 mt-0.5">{formatDateTime(entry.occurred_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
