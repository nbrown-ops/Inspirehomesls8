import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldX, ShieldAlert, AlertTriangle, Clock, GraduationCap, Users, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { DbsBadge } from '@/components/staff/DbsBadge'
import { getDbsStatus, getDbsDaysLeft, isSupervisionDue, supervisionWeeksAgo } from '@/lib/utils/compliance'
import { formatDate } from '@/lib/utils/dates'

export default async function StaffCompliancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role)) redirect('/dashboard')

  // Fetch all active staff
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, full_name, job_title, role, dbs_expiry_date, contracted_hours')
    .in('role', ['manager', 'staff'])
    .eq('is_active', true)
    .order('full_name')

  const staffIds = staffList?.map(s => s.id) ?? []

  // Fetch latest supervision per staff
  const { data: latestSupervisions } = await supabase
    .from('staff_supervisions')
    .select('staff_id, supervision_date')
    .in('staff_id', staffIds)
    .order('supervision_date', { ascending: false })

  const supervisionMap = new Map<string, string>()
  for (const s of latestSupervisions ?? []) {
    if (!supervisionMap.has(s.staff_id)) supervisionMap.set(s.staff_id, s.supervision_date)
  }

  // Fetch training gaps (mandatory categories with no valid record)
  const { data: mandatoryCategories } = await supabase
    .from('mandatory_training_categories')
    .select('id, name')
    .eq('is_active', true)

  const { data: allTraining } = await supabase
    .from('staff_training_records')
    .select('staff_id, category_id, expiry_date')
    .in('staff_id', staffIds)

  // Build training gap map: staffId → gap count
  const trainingGapMap = new Map<string, number>()
  for (const sid of staffIds) {
    const validCategoryIds = new Set(
      (allTraining ?? [])
        .filter(t => t.staff_id === sid && t.category_id && (!t.expiry_date || new Date(t.expiry_date) > new Date()))
        .map(t => t.category_id)
    )
    const gaps = (mandatoryCategories ?? []).filter(c => !validCategoryIds.has(c.id)).length
    trainingGapMap.set(sid, gaps)
  }

  // Classify staff
  const staff = staffList ?? []
  const dbsExpired      = staff.filter(s => getDbsStatus(s.dbs_expiry_date) === 'expired')
  const dbsExpiringSoon = staff.filter(s => getDbsStatus(s.dbs_expiry_date) === 'expiring_soon')
  const dbsMissing      = staff.filter(s => getDbsStatus(s.dbs_expiry_date) === 'missing')
  const supervisionDue  = staff.filter(s => isSupervisionDue(supervisionMap.get(s.id) ?? null))
  const trainingGaps    = staff.filter(s => (trainingGapMap.get(s.id) ?? 0) > 0)

  // Hours summary
  const totalContracted = staff.reduce((sum, s) => sum + (s.contracted_hours ?? 0), 0)
  const staffWithHours  = staff.filter(s => s.contracted_hours)

  const allClear = dbsExpired.length === 0 && dbsExpiringSoon.length === 0 && dbsMissing.length === 0
    && supervisionDue.length === 0 && trainingGaps.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">{staff.length} active staff members monitored</p>
        </div>
        <Link href="/staff" className="text-sm text-slate-500 hover:text-slate-700">← All staff</Link>
      </div>

      {/* All clear banner */}
      {allClear && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">All compliance checks passed</p>
            <p className="text-sm text-green-700 mt-0.5">No DBS issues, supervisions, or training gaps found.</p>
          </div>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<ShieldX className="h-5 w-5 text-red-600" />}
          label="DBS expired"
          count={dbsExpired.length}
          bg={dbsExpired.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}
          countColor={dbsExpired.length > 0 ? 'text-red-700' : 'text-slate-500'}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-amber-600" />}
          label="DBS expiring ≤60 days"
          count={dbsExpiringSoon.length}
          bg={dbsExpiringSoon.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}
          countColor={dbsExpiringSoon.length > 0 ? 'text-amber-700' : 'text-slate-500'}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Supervision overdue"
          count={supervisionDue.length}
          bg={supervisionDue.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}
          countColor={supervisionDue.length > 0 ? 'text-amber-700' : 'text-slate-500'}
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
          label="Training gaps"
          count={trainingGaps.length}
          bg={trainingGaps.length > 0 ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}
          countColor={trainingGaps.length > 0 ? 'text-purple-700' : 'text-slate-500'}
        />
      </div>

      {/* DBS issues */}
      {(dbsExpired.length > 0 || dbsExpiringSoon.length > 0 || dbsMissing.length > 0) && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ShieldX className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-slate-700">DBS issues</p>
            <span className="ml-auto text-xs text-slate-400">
              {dbsExpired.length + dbsExpiringSoon.length + dbsMissing.length} staff affected
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {[...dbsExpired, ...dbsExpiringSoon, ...dbsMissing].map(s => {
              const daysLeft = getDbsDaysLeft(s.dbs_expiry_date)
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/staff/${s.id}`} className="text-sm font-medium text-slate-900 hover:text-purple-700">
                      {s.full_name}
                    </Link>
                    {s.job_title && <p className="text-xs text-slate-500">{s.job_title}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.dbs_expiry_date && (
                      <span className="text-xs text-slate-500">
                        {daysLeft !== null && daysLeft < 0
                          ? `Expired ${Math.abs(daysLeft)}d ago`
                          : daysLeft !== null
                          ? `${daysLeft}d remaining`
                          : formatDate(s.dbs_expiry_date)}
                      </span>
                    )}
                    <DbsBadge expiryDate={s.dbs_expiry_date} size="sm" />
                    <Link href={`/staff/${s.id}/edit`} className="text-xs text-purple-700 hover:text-purple-900 font-medium">
                      Update →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Supervision overdue */}
      {supervisionDue.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-slate-700">Supervision overdue (&gt;8 weeks)</p>
            <span className="ml-auto text-xs text-slate-400">{supervisionDue.length} staff</span>
          </div>
          <div className="divide-y divide-slate-100">
            {supervisionDue.map(s => {
              const lastDate = supervisionMap.get(s.id) ?? null
              const weeks    = supervisionWeeksAgo(lastDate)
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/staff/${s.id}`} className="text-sm font-medium text-slate-900 hover:text-purple-700">
                      {s.full_name}
                    </Link>
                    {s.job_title && <p className="text-xs text-slate-500">{s.job_title}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${!lastDate || (weeks !== null && weeks > 12) ? 'text-red-600' : 'text-amber-600'}`}>
                      {lastDate
                        ? `Last: ${formatDate(lastDate)} (${weeks}w ago)`
                        : 'No record'}
                    </span>
                    <Link href={`/staff/${s.id}?tab=supervision`} className="text-xs text-purple-700 hover:text-purple-900 font-medium">
                      Log →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Training gaps */}
      {trainingGaps.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-semibold text-slate-700">Mandatory training gaps</p>
            <span className="ml-auto text-xs text-slate-400">{trainingGaps.length} staff</span>
          </div>
          <div className="divide-y divide-slate-100">
            {trainingGaps.map(s => {
              const gapCount = trainingGapMap.get(s.id) ?? 0
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/staff/${s.id}`} className="text-sm font-medium text-slate-900 hover:text-purple-700">
                      {s.full_name}
                    </Link>
                    {s.job_title && <p className="text-xs text-slate-500">{s.job_title}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="danger">{gapCount} gap{gapCount > 1 ? 's' : ''}</Badge>
                    <Link href={`/staff/${s.id}?tab=training`} className="text-xs text-purple-700 hover:text-purple-900 font-medium">
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Hours summary */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-700">Contracted hours summary</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{staff.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Active staff</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{staffWithHours.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">With hours recorded</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{totalContracted.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total contracted hrs/week</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {staff.map(s => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                <Link href={`/staff/${s.id}`} className="text-slate-900 hover:text-purple-700 font-medium">
                  {s.full_name}
                </Link>
                <span className="text-slate-500">
                  {s.contracted_hours ? `${s.contracted_hours}h/week` : <span className="text-slate-300 italic">not recorded</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon, label, count, bg, countColor
}: {
  icon: React.ReactNode
  label: string
  count: number
  bg: string
  countColor: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${countColor}`}>{count}</p>
    </div>
  )
}
