import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import { createIncidentAction } from '../actions'
import { canWrite } from '@/lib/constants/roles'

export default async function NewIncidentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !canWrite(profile.role) || profile.role === 'auditor') redirect('/incidents')

  const { data: residents } = await supabase
    .from('service_users')
    .select('id, first_name, last_name')
    .in('status', ['active', 'on_leave', 'hospital'])
    .order('last_name')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to incidents
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Report Incident</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete all sections accurately. Use factual language only.
        </p>
      </div>

      <IncidentForm
        action={createIncidentAction}
        residents={residents ?? []}
      />
    </div>
  )
}
