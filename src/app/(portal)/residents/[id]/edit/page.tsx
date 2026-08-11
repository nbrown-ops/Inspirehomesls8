import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ResidentForm } from '@/components/residents/ResidentForm'
import { updateResidentAction } from '../../actions'
import { isAdmin } from '@/lib/constants/roles'

interface Props {
  params: { id: string }
}

export default async function EditResidentPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/residents/${params.id}`)

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profileData || !isAdmin(profileData.role)) {
    redirect(`/residents/${params.id}`)
  }

  const [{ data: resident }, { data: homes }, { data: staff }, { data: professionals }] = await Promise.all([
    supabase
      .from('service_users')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('homes')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .in('role', ['manager', 'staff'])
      .order('full_name'),
    supabase
      .from('service_user_professionals')
      .select('role, external_name, external_org, external_phone, external_email')
      .eq('service_user_id', params.id),
  ])

  if (!resident) notFound()

  // Bind the resident ID into the action
  const boundAction = updateResidentAction.bind(null, params.id)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/residents/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Edit profile — {resident.first_name} {resident.last_name}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ResidentForm
          action={boundAction}
          homes={homes ?? []}
          staff={staff ?? []}
          defaultValues={resident}
          defaultProfessionals={(professionals ?? []).map(p => ({
            role:  p.role,
            name:  p.external_name  ?? '',
            org:   p.external_org   ?? '',
            phone: p.external_phone ?? '',
            email: p.external_email ?? '',
          }))}
        />
      </div>
    </div>
  )
}
