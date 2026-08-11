import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DbsBadge } from '@/components/staff/DbsBadge'
import { getDbsStatus, isSupervisionDue } from '@/lib/utils/compliance'
import { formatDate } from '@/lib/utils/dates'
import { ROLE_LABELS } from '@/lib/constants/roles'
import type { UserRole } from '@/types'

export default async function StaffListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role)) {
    redirect('/dashboard')
  }

  const isSuperAdmin = myProfile.role === 'super_admin'

  // Fetch all staff with latest supervision date
  const { data: staffList } = await supabase
    .from('profiles')
    .select(`
      id, full_name, preferred_name, role, job_title, photo_url,
      phone, email, is_active, employment_start_date,
      dbs_expiry_date, dbs_certificate_number, contracted_hours,
      user_home_assignments(home:homes!home_id(id, name))
    `)
    .in('role', ['manager', 'staff'])
    .order('full_name')

  // Fetch latest supervision per staff member
  const staffIds = staffList?.map(s => s.id) ?? []
  const { data: latestSupervisions } = await supabase
    .from('staff_supervisions')
    .select('staff_id, supervision_date')
    .in('staff_id', staffIds)
    .order('supervision_date', { ascending: false })

  // Build a map: staffId → most recent supervision date
  const supervisionMap = new Map<string, string>()
  for (const s of latestSupervisions ?? []) {
    if (!supervisionMap.has(s.staff_id)) {
      supervisionMap.set(s.staff_id, s.supervision_date)
    }
  }

  const active   = staffList?.filter(s => s.is_active) ?? []
  const inactive = staffList?.filter(s => !s.is_active) ?? []

  // Counts for header badges
  const dbsIssueCount  = active.filter(s => ['expired', 'expiring_soon', 'missing'].includes(getDbsStatus(s.dbs_expiry_date))).length
  const supervisionDue = active.filter(s => isSupervisionDue(supervisionMap.get(s.id) ?? null)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.length} active staff members
            {dbsIssueCount > 0 && <span className="ml-2 text-red-600 font-medium">· {dbsIssueCount} DBS issues</span>}
            {supervisionDue > 0 && <span className="ml-2 text-amber-600 font-medium">· {supervisionDue} supervision due</span>}
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/admin/users/invite">
              <UserPlus className="h-4 w-4" />
              Invite staff member
            </Link>
          </Button>
        )}
      </div>

      {/* Compliance summary banner */}
      {(dbsIssueCount > 0 || supervisionDue > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap gap-4 items-center">
          <p className="text-sm font-semibold text-amber-800">Compliance alerts</p>
          {dbsIssueCount > 0 && (
            <Badge variant="danger">{dbsIssueCount} DBS issue{dbsIssueCount > 1 ? 's' : ''}</Badge>
          )}
          {supervisionDue > 0 && (
            <Badge variant="warning">{supervisionDue} supervision{supervisionDue > 1 ? 's' : ''} overdue</Badge>
          )}
          <Link href="/staff/compliance" className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2">
            View compliance dashboard →
          </Link>
        </div>
      )}

      {/* Active staff table */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Active staff ({active.length})
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">DBS status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supervision</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map(s => {
                  const lastSupervision = supervisionMap.get(s.id) ?? null
                  const supDue          = isSupervisionDue(lastSupervision)
                  const homes           = (s.user_home_assignments as unknown as { home: { id: string; name: string } | null }[])
                    .map(a => a.home?.name).filter(Boolean).join(', ')

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                              {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{s.full_name}</p>
                            {s.job_title && <p className="text-xs text-slate-500">{s.job_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[s.role as UserRole]}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{homes || '—'}</td>
                      <td className="px-4 py-3">
                        <DbsBadge expiryDate={s.dbs_expiry_date} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {lastSupervision ? (
                          <span className={`text-xs font-medium ${supDue ? 'text-amber-600' : 'text-slate-500'}`}>
                            {supDue ? '⚠ ' : ''}{formatDate(lastSupervision)}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">No record</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.employment_start_date ? formatDate(s.employment_start_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/staff/${s.id}`}
                          className="text-xs font-medium text-purple-700 hover:text-purple-900"
                        >
                          View profile →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Inactive */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Inactive / Left ({inactive.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {inactive.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.job_title ?? ROLE_LABELS[s.role as UserRole]}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/staff/${s.id}`} className="text-xs text-slate-500 hover:text-slate-700">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {active.length === 0 && inactive.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No staff members found</p>
        </div>
      )}
    </div>
  )
}
