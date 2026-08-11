import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/dates'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { Building2, Users, ShieldCheck, Activity } from 'lucide-react'
import type { UserRole } from '@/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') redirect('/dashboard')

  const [
    { data: homes },
    { data: allStaff },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from('homes').select('id, name, city, postcode, max_occupancy, is_active, manager_id, profiles!manager_id(full_name)').order('name'),
    supabase.from('profiles').select('id, full_name, email, role, is_active, created_at, user_home_assignments(home:homes!home_id(name))').order('full_name'),
    supabase.from('audit_logs').select('id, user_id, action, table_name, created_at, profiles!user_id(full_name)').order('created_at', { ascending: false }).limit(20),
  ])

  const activeStaff   = allStaff?.filter(s => s.is_active) ?? []
  const inactiveStaff = allStaff?.filter(s => !s.is_active) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">System configuration, user management, and audit trail.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={<Building2 className="h-5 w-5 text-purple-600" />} label="Homes" value={homes?.length ?? 0} bg="bg-purple-50" />
        <StatTile icon={<Users className="h-5 w-5 text-blue-600" />} label="Active staff" value={activeStaff.length} bg="bg-blue-50" />
        <StatTile icon={<ShieldCheck className="h-5 w-5 text-green-600" />} label="Inactive accounts" value={inactiveStaff.length} bg="bg-green-50" />
        <StatTile icon={<Activity className="h-5 w-5 text-amber-600" />} label="Audit entries (today)" value={recentAudit?.length ?? 0} bg="bg-amber-50" />
      </div>

      {/* Homes */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Properties / Homes</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Manager</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {homes?.map(home => (
                <tr key={home.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{home.name}</td>
                  <td className="px-4 py-3 text-slate-500">{home.city}, {home.postcode}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {(home.profiles as unknown as { full_name: string } | null)?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{home.max_occupancy}</td>
                  <td className="px-4 py-3">
                    <Badge variant={home.is_active ? 'success' : 'default'}>
                      {home.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Staff accounts */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">All Staff Accounts ({allStaff?.length ?? 0})</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Homes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allStaff?.map(staff => {
                const homes = (staff.user_home_assignments as unknown as { home: { name: string } }[])?.map(a => a.home?.name).join(', ')
                return (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/staff/${staff.id}`} className="font-medium text-slate-900 hover:text-purple-700">
                        {staff.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{staff.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {ROLE_LABELS[staff.role as UserRole]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{homes || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={staff.is_active ? 'success' : 'default'}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit log */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Audit Trail</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Table</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAudit?.map(entry => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-slate-700">
                    {(entry.profiles as unknown as { full_name: string } | null)?.full_name ?? 'System'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{entry.action}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{entry.table_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(entry.created_at, 'dd/MM/yyyy HH:mm')}</td>
                </tr>
              ))}
              {!recentAudit?.length && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatTile({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} rounded-xl border border-slate-200 p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
