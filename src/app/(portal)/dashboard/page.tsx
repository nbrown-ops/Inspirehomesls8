import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, FileWarning, AlertTriangle, ClipboardList, CalendarClock, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { subDays, formatISO } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, preferred_name, role, job_title, phone, photo_url, employment_start_date, handbook_acknowledged_at, confidentiality_acknowledged_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const ago7 = formatISO(subDays(new Date(), 7))

  // Stats fetches — scoped by role via RLS
  const [
    { data: activeResidents, count: residentCount },
    { data: openAlerts },
    { data: openIncidents },
    { data: recentLogs },
    { data: activeShift },
  ] = await Promise.all([
    supabase.from('service_users').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('alerts').select('id, title, alert_type, triggered_at').eq('is_resolved', false).order('triggered_at', { ascending: false }).limit(5),
    supabase.from('incident_reports').select('id, incident_type, severity, created_at, service_users(first_name, last_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
    supabase.from('interaction_timeline').select('id, interaction_type, occurred_at, service_users(first_name, last_name), staff:profiles(full_name)').gte('occurred_at', ago7).order('occurred_at', { ascending: false }).limit(8),
    supabase.from('shifts').select('id, shift_type, start_time').eq('staff_id', user.id).is('end_time', null).single(),
  ])

  const isNewStaff    = profile.role === 'staff' || profile.role === 'manager'
  const profileComplete = !!(profile.job_title && profile.phone)
  const showOnboarding  = isNewStaff && (!profileComplete || !profile.handbook_acknowledged_at || !profile.confidentiality_acknowledged_at)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const SEVERITY_COLOR: Record<string, string> = {
    critical: 'text-red-700 bg-red-100',
    high:     'text-red-600 bg-red-50',
    medium:   'text-amber-700 bg-amber-100',
    low:      'text-slate-600 bg-slate-100',
  }


  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {profile.preferred_name ?? profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{formatDate(new Date())}</p>
      </div>

      {/* Onboarding checklist */}
      {showOnboarding && (
        <OnboardingChecklist
          staffId={profile.id}
          profileComplete={profileComplete}
          handbookAcknowledged={!!profile.handbook_acknowledged_at}
          confidentialityAcknowledged={!!profile.confidentiality_acknowledged_at}
        />
      )}

      {/* Active shift banner */}
      {activeShift && (
        <div className="rounded-xl bg-purple-700 text-white p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Active shift in progress</p>
              <p className="text-xs text-purple-200 mt-0.5">{activeShift.shift_type?.replace(/_/g, ' ')} · Started {formatTimeAgo(activeShift.start_time)}</p>
            </div>
          </div>
          <Link href={`/shifts/${activeShift.id}`} className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            View shift →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5 text-purple-600" />} label="Active residents" value={residentCount ?? 0} href="/residents" bg="bg-purple-50" />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Open alerts" value={openAlerts?.length ?? 0} href="/reports" bg={openAlerts?.length ? 'bg-red-50' : 'bg-white'} />
        <StatCard icon={<FileWarning className="h-5 w-5 text-amber-500" />} label="Open incidents" value={openIncidents?.length ?? 0} href="/incidents" bg={openIncidents?.length ? 'bg-amber-50' : 'bg-white'} />
        <StatCard icon={<ClipboardList className="h-5 w-5 text-blue-500" />} label="Activity (7 days)" value={recentLogs?.length ?? 0} href="/residents" bg="bg-blue-50" />
      </div>

      {/* Two-column: alerts + activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Open alerts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Open alerts</p>
            <Link href="/reports" className="text-xs text-purple-700 font-medium hover:text-purple-900">View all →</Link>
          </div>
          {!openAlerts?.length ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">No open alerts.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openAlerts.map(a => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-900 font-medium line-clamp-1">{a.title}</p>
                    <span className="text-xs text-slate-400 shrink-0">{formatTimeAgo(a.triggered_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{a.alert_type.replace(/_/g, ' ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Recent activity</p>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          {!recentLogs?.length ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">No activity in the last 7 days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLogs.map((log: any) => (
                <li key={log.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-900 font-medium">
                        {log.service_users?.first_name} {log.service_users?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {log.interaction_type?.replace(/_/g, ' ')} · {log.staff?.full_name}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatTimeAgo(log.occurred_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Open incidents */}
      {!!openIncidents?.length && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Open incidents requiring action</p>
            <Link href="/incidents" className="text-xs text-purple-700 font-medium hover:text-purple-900">View all →</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {openIncidents.map((inc: any) => (
              <li key={inc.id}>
                <Link href={`/incidents/${inc.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(inc.service_users as any)?.first_name} {(inc.service_users as any)?.last_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{inc.incident_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${SEVERITY_COLOR[inc.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inc.severity}
                    </span>
                    <span className="text-xs text-slate-400">{formatTimeAgo(inc.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, href, bg }: { icon: React.ReactNode; label: string; value: number; href: string; bg: string }) {
  return (
    <Link href={href} className={`${bg} rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-colors block`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Link>
  )
}
