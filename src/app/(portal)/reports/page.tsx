import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OfstedScoreCard } from '@/components/reports/OfstedScoreCard'
import { AlertsPanel } from '@/components/reports/AlertsPanel'
import { IncidentChart } from '@/components/reports/IncidentChart'
import { KeyworkRateCard } from '@/components/reports/KeyworkRateCard'
import { OccupancyCard } from '@/components/reports/OccupancyCard'
import { formatDateTime } from '@/lib/utils/dates'
import { subDays, subMonths, formatISO } from 'date-fns'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager', 'auditor'].includes(profile.role as string)) {
    redirect('/dashboard')
  }

  const now       = new Date()
  const ago7      = formatISO(subDays(now, 7))
  const ago30     = formatISO(subDays(now, 30))
  const ago90     = formatISO(subMonths(now, 3))
  const ago8weeks = formatISO(subDays(now, 56))

  // ── Parallel data fetches (allSettled so one timeout can't crash the page) ──
  const results = await Promise.allSettled([
    supabase.from('homes').select('id, name, max_occupancy').eq('is_active', true),
    supabase.from('service_users').select('id, home_id, status').eq('status', 'active'),
    supabase.from('incident_reports').select('id, incident_type, severity, status, created_at, manager_sign_off_at').gte('created_at', ago90),
    supabase.from('alerts').select('id, alert_type, title, message, triggered_at, service_user_id, service_users(first_name, last_name)').eq('is_resolved', false).order('triggered_at', { ascending: false }),
    supabase.from('care_plans').select('id, service_user_id, status, review_date, last_reviewed_at').eq('status', 'active'),
    supabase.from('interaction_timeline').select('id, service_user_id, occurred_at').eq('interaction_type', 'risk_assessment_review' as any).gte('occurred_at', ago90),
    supabase.from('profiles').select('id, dbs_expiry_date').in('role', ['manager', 'staff']).eq('is_active', true),
    supabase.from('staff_supervisions').select('staff_id, supervision_date').gte('supervision_date', ago8weeks),
    supabase.from('interaction_timeline').select('service_user_id, occurred_at').eq('interaction_type', 'key_work_session' as any).gte('occurred_at', ago7),
  ])

  // Extract data safely — a failed/timed-out query falls back to null/[]
  function pick<T>(r: PromiseSettledResult<{ data: T | null }>): T | null {
    return r.status === 'fulfilled' ? r.value.data : null
  }
  const homes           = pick(results[0] as PromiseSettledResult<{ data: any[] | null }>)
  const activeResidents = pick(results[1] as PromiseSettledResult<{ data: any[] | null }>)
  const incidents90     = pick(results[2] as PromiseSettledResult<{ data: any[] | null }>)
  const openAlerts      = pick(results[3] as PromiseSettledResult<{ data: any[] | null }>)
  const carePlans       = pick(results[4] as PromiseSettledResult<{ data: any[] | null }>)
  const riskAssessments = pick(results[5] as PromiseSettledResult<{ data: any[] | null }>)
  const staffList       = pick(results[6] as PromiseSettledResult<{ data: any[] | null }>)
  const supervisions    = pick(results[7] as PromiseSettledResult<{ data: any[] | null }>)
  const keyworkSessions = pick(results[8] as PromiseSettledResult<{ data: any[] | null }>)

  // ── Ofsted/CQC Score calculation ──────────────────────────────
  const totalResidents = activeResidents?.length ?? 0
  const totalStaff     = staffList?.length ?? 0

  // 1. % residents with active care plans
  const residentsWithCarePlans = new Set(carePlans?.map(c => c.service_user_id)).size
  const carePlanPct = totalResidents > 0 ? Math.round((residentsWithCarePlans / totalResidents) * 100) : 100

  // 2. % incidents signed off within 24h
  const closedIncidents   = incidents90?.filter(i => i.manager_sign_off_at) ?? []
  const signedWithin24h   = closedIncidents.filter(i => {
    const diff = new Date(i.manager_sign_off_at!).getTime() - new Date(i.created_at).getTime()
    return diff <= 86_400_000
  })
  const incidentSignoffPct = closedIncidents.length > 0
    ? Math.round((signedWithin24h.length / closedIncidents.length) * 100)
    : 100

  // 3. % DBS checks valid (not expired, not missing)
  const validDbs   = staffList?.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > now).length ?? 0
  const dbsPct     = totalStaff > 0 ? Math.round((validDbs / totalStaff) * 100) : 100

  // 4. % supervisions up to date (at least one in last 8 weeks)
  const supervisedStaffIds = new Set(supervisions?.map(s => s.staff_id))
  const supervisionPct     = totalStaff > 0 ? Math.round((supervisedStaffIds.size / totalStaff) * 100) : 100

  // 5. % risk assessments reviewed in last 3 months (via interaction_timeline risk_assessment_review entries)
  const reviewedIds = new Set(riskAssessments?.map(r => r.service_user_id))
  const riskPct     = totalResidents > 0 ? Math.round((reviewedIds.size / totalResidents) * 100) : 100

  const scores = [
    { label: 'Care plans current',        pct: carePlanPct,       weight: 25 },
    { label: 'Incidents signed off <24h', pct: incidentSignoffPct, weight: 20 },
    { label: 'DBS checks valid',          pct: dbsPct,             weight: 20 },
    { label: 'Supervisions up to date',   pct: supervisionPct,     weight: 20 },
    { label: 'Risk assessments reviewed', pct: riskPct,            weight: 15 },
  ]
  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + (s.pct * s.weight) / 100, 0)
  )

  // ── Incident chart (by type, last 3 months) ────────────────────
  const typeCount: Record<string, number> = {}
  for (const inc of incidents90 ?? []) {
    typeCount[inc.incident_type] = (typeCount[inc.incident_type] ?? 0) + 1
  }
  const incidentBreakdown = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // ── Keywork rate ───────────────────────────────────────────────
  const keyworkedIds     = new Set(keyworkSessions?.map(k => k.service_user_id))
  const keyworkRate      = totalResidents > 0 ? Math.round((keyworkedIds.size / totalResidents) * 100) : 0
  const keyworkCount     = keyworkedIds.size

  // ── Occupancy ─────────────────────────────────────────────────
  const occupancyByHome = (homes ?? []).map(h => ({
    id:       h.id,
    name:     h.name,
    capacity: h.max_occupancy,
    occupied: activeResidents?.filter(r => r.home_id === h.id).length ?? 0,
  }))

  const generatedAt = formatDateTime(now)
  const failedQueries = results.filter(r => r.status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Partial data warning */}
      {failedQueries > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span className="font-semibold">⚠ Partial data:</span>
          {failedQueries} data source{failedQueries > 1 ? 's' : ''} could not be loaded (database may be waking up). Refresh the page to retry.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance &amp; Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generated {generatedAt} · Data refreshes on each page load</p>
        </div>
        <a
          href="/api/exports/compliance"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
        >
          Export PDF
        </a>
      </div>

      {/* Ofsted/CQC Score */}
      <OfstedScoreCard overallScore={overallScore} scores={scores} />

      {/* Second row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <KeyworkRateCard rate={keyworkRate} count={keyworkCount} total={totalResidents} />
        <OccupancyCard homes={occupancyByHome} />
      </div>

      {/* Incident chart */}
      <IncidentChart breakdown={incidentBreakdown} totalCount={incidents90?.length ?? 0} />

      {/* Open alerts */}
      <AlertsPanel alerts={(openAlerts ?? []) as any} />
    </div>
  )
}
