import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ResidentForm } from '@/components/residents/ResidentForm'
import { createResidentAction } from '../actions'
import { canWrite, isAdmin } from '@/lib/constants/roles'

export default async function NewResidentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Only managers and above can create residents
  if (!profileData || !isAdmin(profileData.role)) {
    redirect('/residents')
  }

  const [{ data: homes }, { data: staff }] = await Promise.all([
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
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/residents"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add new resident</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a service user profile. You can add documents and care plans after saving.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ResidentForm
          action={createResidentAction}
          homes={homes ?? []}
          staff={staff ?? []}
        />
      </div>
    </div>
  )
}
