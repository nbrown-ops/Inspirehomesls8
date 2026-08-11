import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffTasksTab } from '@/components/staff/StaffTasksTab'
import { CheckSquare } from 'lucide-react'

export default async function MyTasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, preferred_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: tasks } = await supabase
    .from('staff_tasks')
    .select(`
      id, title, description, priority, status, due_date, created_at,
      completed_at, completion_note,
      assigned_by:profiles!assigned_by(full_name),
      completed_by:profiles!completed_by(full_name)
    `)
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false })

  const { data: homeAssignment } = await supabase
    .from('user_home_assignments')
    .select('home_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const open = (tasks ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress')

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {open.length} open task{open.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      <StaffTasksTab
        staffId={user.id}
        staffName={profile.preferred_name ?? profile.full_name.split(' ')[0]}
        tasks={(tasks ?? []) as any}
        homeId={homeAssignment?.home_id ?? ''}
        canManage={['super_admin', 'manager'].includes(profile.role)}
        isSelf={true}
      />
    </div>
  )
}
