import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { updateStaffProfileAction } from '@/app/(portal)/staff/actions'

interface Props { params: { id: string } }

export default async function EditStaffPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role)) redirect('/dashboard')

  const { data: staff } = await supabase
    .from('profiles')
    .select(`
      id, full_name, preferred_name, role, job_title, phone, email,
      employment_start_date, contracted_hours, is_active,
      dbs_certificate_number, dbs_issue_date, dbs_expiry_date, dbs_update_service,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
    `)
    .eq('id', params.id)
    .single()

  if (!staff) notFound()

  const boundAction = updateStaffProfileAction.bind(null, params.id)

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/staff/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit staff profile</h1>
        <p className="mt-1 text-sm text-slate-500">{staff.full_name}</p>
      </div>

      <form action={boundAction as (formData: FormData) => void} className="space-y-8">
        {/* Personal details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Personal details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name <span className="text-red-500">*</span></Label>
              <Input id="full_name" name="full_name" defaultValue={staff.full_name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferred_name">Preferred name</Label>
              <Input id="preferred_name" name="preferred_name" defaultValue={staff.preferred_name ?? ''} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" name="job_title" defaultValue={staff.job_title ?? ''} placeholder="e.g. Support Worker" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={staff.phone ?? ''} />
            </div>
          </div>
        </section>

        {/* Employment details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Employment details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="employment_start_date">Employment start date</Label>
              <Input
                id="employment_start_date"
                name="employment_start_date"
                type="date"
                defaultValue={staff.employment_start_date ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contracted_hours">Contracted hours / week</Label>
              <Input
                id="contracted_hours"
                name="contracted_hours"
                type="number"
                min="0"
                max="168"
                step="0.5"
                defaultValue={staff.contracted_hours ?? ''}
                placeholder="e.g. 37.5"
              />
            </div>
          </div>
        </section>

        {/* DBS details */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">DBS details</h2>

          <div className="space-y-1.5">
            <Label htmlFor="dbs_certificate_number">DBS certificate number</Label>
            <Input
              id="dbs_certificate_number"
              name="dbs_certificate_number"
              defaultValue={staff.dbs_certificate_number ?? ''}
              placeholder="12-digit certificate number"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dbs_issue_date">Issue date</Label>
              <Input id="dbs_issue_date" name="dbs_issue_date" type="date" defaultValue={staff.dbs_issue_date ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dbs_expiry_date">Expiry date</Label>
              <Input id="dbs_expiry_date" name="dbs_expiry_date" type="date" defaultValue={staff.dbs_expiry_date ?? ''} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dbs_update_service">DBS Update Service</Label>
            <Select id="dbs_update_service" name="dbs_update_service" defaultValue={staff.dbs_update_service ? 'true' : 'false'}>
              <option value="false">Not enrolled</option>
              <option value="true">Enrolled</option>
            </Select>
          </div>
        </section>

        {/* Emergency contact */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Emergency contact</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact_name">Name</Label>
              <Input
                id="emergency_contact_name"
                name="emergency_contact_name"
                defaultValue={staff.emergency_contact_name ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact_relationship">Relationship</Label>
              <Input
                id="emergency_contact_relationship"
                name="emergency_contact_relationship"
                defaultValue={staff.emergency_contact_relationship ?? ''}
                placeholder="e.g. Partner, Parent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_phone">Phone number</Label>
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              type="tel"
              defaultValue={staff.emergency_contact_phone ?? ''}
            />
          </div>
        </section>

        <div className="flex gap-3">
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/staff/${params.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1 bg-purple-700 hover:bg-purple-800">Save changes</Button>
        </div>
      </form>
    </div>
  )
}
