import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import { updateIncidentAction } from '../../actions'
import { canWrite } from '@/lib/constants/roles'

export default async function EditIncidentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/incidents/${params.id}`)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !canWrite(profile.role) || profile.role === 'auditor') {
    redirect(`/incidents/${params.id}`)
  }

  const [{ data: incident }, { data: residents }] = await Promise.all([
    supabase
      .from('incident_reports')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('service_users')
      .select('id, first_name, last_name')
      .in('status', ['active', 'on_leave', 'hospital'])
      .order('last_name'),
  ])

  if (!incident) notFound()

  // Staff can only edit open incidents; managers can edit any non-closed
  if (profile.role === 'staff' && incident.status !== 'open') {
    redirect(`/incidents/${params.id}`)
  }

  const boundAction = updateIncidentAction.bind(null, params.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/incidents/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to incident
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Incident Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Amending a submitted report. All changes are logged.
        </p>
      </div>

      <IncidentForm
        action={boundAction}
        residents={residents ?? []}
        defaultValues={incident}
      />
    </div>
  )
}
