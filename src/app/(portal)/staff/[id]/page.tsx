import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Phone, Mail, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DbsBadge } from '@/components/staff/DbsBadge'
import { StaffTrainingTab }    from '@/components/staff/StaffTrainingTab'
import { StaffSupervisionTab } from '@/components/staff/StaffSupervisionTab'
import { StaffAppraisalTab }   from '@/components/staff/StaffAppraisalTab'
import { StaffTasksTab }       from '@/components/staff/StaffTasksTab'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { formatDate } from '@/lib/utils/dates'
import { isSupervisionDue, getDbsStatus } from '@/lib/utils/compliance'
import type { UserRole } from '@/types'

interface Props { params: { id: string } }

export default async function StaffProfilePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()

  if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role as string)) {
    redirect('/dashboard')
  }

  const canEdit = ['super_admin', 'manager'].includes(myProfile.role as string)

  const [
    { data: staff },
    { data: training },
    { data: supervisions },
    { data: appraisals },
    { data: categories },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id, full_name, preferred_name, role, job_title, photo_url,
        phone, email, is_active, employment_start_date, contracted_hours,
        dbs_certificate_number, dbs_issue_date, dbs_expiry_date, dbs_update_service,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        user_home_assignments(home:homes!home_id(id, name))
      `)
      .eq('id', params.id)
      .single(),

    supabase
      .from('staff_training_records')
      .select('id, training_name, category_id, completed_date, expiry_date, provider, notes')
      .eq('staff_id', params.id)
      .order('completed_date', { ascending: false }),

    supabase
      .from('staff_supervisions')
      .select(`
        id, supervision_date, type, duration_minutes, topics, notes, actions,
        signed_off_at, signed_off_by,
        supervisor:profiles!supervisor_id(full_name)
      `)
      .eq('staff_id', params.id)
      .order('supervision_date', { ascending: false }),

    supabase
      .from('staff_appraisals')
      .select(`
        id, appraisal_date, period_start, period_end, overall_rating,
        strengths, development_areas, notes, signed_by_staff, signed_at,
        appraiser:profiles!appraiser_id(full_name)
      `)
      .eq('staff_id', params.id)
      .order('appraisal_date', { ascending: false }),

    supabase
      .from('mandatory_training_categories')
      .select('id, name, valid_for_months')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('staff_tasks')
      .select(`
        id, title, description, priority, status, due_date, created_at,
        completed_at, completion_note,
        assigned_by:profiles!assigned_by(full_name),
        completed_by:profiles!completed_by(full_name)
      `)
      .eq('assigned_to', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!staff) notFound()

  const isSelf          = myProfile.id === params.id
  const homes           = (staff.user_home_assignments as unknown as { home: { id: string; name: string } | null }[])
    .map(a => a.home).filter(Boolean)
  const lastSupervision = supervisions?.[0]?.supervision_date ?? null
  const supDue          = isSupervisionDue(lastSupervision)
  const dbsStatus       = getDbsStatus(staff.dbs_expiry_date)

  // Compute training gaps: mandatory categories with no valid record
  const categoryIds = new Set(
    (training ?? [])
      .filter(t => t.category_id && (!t.expiry_date || new Date(t.expiry_date) > new Date()))
      .map(t => t.category_id)
  )
  const trainingGaps = (categories ?? []).filter(c => !categoryIds.has(c.id))

  const RATING_CONFIG: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'danger' | 'default' }> = {
    excellent:             { label: 'Excellent',             variant: 'success'  },
    good:                  { label: 'Good',                  variant: 'primary'  },
    satisfactory:          { label: 'Satisfactory',          variant: 'warning'  },
    requires_improvement:  { label: 'Requires Improvement',  variant: 'danger'   },
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        All staff
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className={`h-20 ${staff.is_active ? 'bg-gradient-to-r from-[#141422] to-[#8DC63F]' : 'bg-slate-400'}`} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4 flex-wrap gap-3">
            {staff.photo_url ? (
              <img src={staff.photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-purple-700 border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-bold">
                {staff.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {!staff.is_active && <Badge variant="default">Inactive</Badge>}
              {supDue && <Badge variant="warning">Supervision due</Badge>}
              {['expired', 'expiring_soon'].includes(dbsStatus) && (
                <Badge variant={dbsStatus === 'expired' ? 'danger' : 'warning'}>
                  DBS {dbsStatus === 'expired' ? 'Expired' : 'Expiring Soon'}
                </Badge>
              )}
              {trainingGaps.length > 0 && (
                <Badge variant="danger">{trainingGaps.length} training gap{trainingGaps.length > 1 ? 's' : ''}</Badge>
              )}
              {canEdit && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/staff/${params.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            {staff.full_name}
            {staff.preferred_name && staff.preferred_name !== staff.full_name && (
              <span className="ml-2 text-base font-normal text-slate-400">({staff.preferred_name})</span>
            )}
          </h1>
          <p className="text-slate-500 mt-0.5">{staff.job_title ?? ROLE_LABELS[staff.role as UserRole]}</p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm">
            {staff.phone && (
              <a href={`tel:${staff.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-purple-700">
                <Phone className="h-4 w-4 text-slate-400" />
                {staff.phone}
              </a>
            )}
            {staff.email && (
              <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-purple-700">
                <Mail className="h-4 w-4 text-slate-400" />
                {staff.email}
              </a>
            )}
            {staff.employment_start_date && (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-4 w-4 text-slate-400" />
                Started {formatDate(staff.employment_start_date)}
              </span>
            )}
            {staff.contracted_hours && (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                {staff.contracted_hours}h/week contracted
              </span>
            )}
          </div>

          {/* Assigned homes */}
          {homes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {homes.map(h => (
                <span key={h!.id} className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700 font-medium">
                  {h!.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance warnings */}
      {trainingGaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Mandatory training gaps</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trainingGaps.map(g => (
              <span key={g.id} className="px-2.5 py-1 bg-red-100 border border-red-200 rounded-full text-xs text-red-700 font-medium">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="tasks">
            Tasks
            {(tasks ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress').length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                {(tasks ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress').length}
              </span>
            )}
          </Tab>
          <Tab id="dbs">DBS</Tab>
          <Tab id="training">Training {trainingGaps.length > 0 && <span className="ml-1 text-red-500">({trainingGaps.length})</span>}</Tab>
          <Tab id="supervision">Supervision {supDue && <span className="ml-1 text-amber-500">(!)</span>}</Tab>
          <Tab id="appraisals">Appraisals</Tab>
        </TabList>

        {/* ── TASKS ───────────────────────────────── */}
        <TabPanel id="tasks">
          <StaffTasksTab
            staffId={params.id}
            staffName={staff.preferred_name ?? staff.full_name.split(' ')[0]}
            tasks={(tasks ?? []) as any}
            homeId={homes[0]?.id ?? ''}
            canManage={canEdit}
            isSelf={isSelf}
          />
        </TabPanel>

        {/* ── OVERVIEW ────────────────────────────── */}
        <TabPanel id="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard title="Employment details">
              <Row label="Full name"       value={staff.full_name} />
              <Row label="Preferred name"  value={staff.preferred_name} />
              <Row label="Role"            value={ROLE_LABELS[staff.role as UserRole]} />
              <Row label="Job title"       value={staff.job_title} />
              <Row label="Start date"      value={staff.employment_start_date ? formatDate(staff.employment_start_date) : null} />
              <Row label="Contracted hrs"  value={staff.contracted_hours ? `${staff.contracted_hours}h/week` : null} />
              <Row label="Properties"      value={homes.map(h => h!.name).join(', ') || null} />
            </InfoCard>

            <InfoCard title="Contact details">
              <Row label="Phone"  value={staff.phone} />
              <Row label="Email"  value={staff.email} />
            </InfoCard>

            <InfoCard title="Emergency contact">
              {staff.emergency_contact_name ? (
                <>
                  <Row label="Name"         value={staff.emergency_contact_name} />
                  <Row label="Relationship" value={staff.emergency_contact_relationship} />
                  <Row label="Phone"        value={staff.emergency_contact_phone} />
                </>
              ) : (
                <p className="text-sm text-slate-400 italic py-2">No emergency contact recorded.</p>
              )}
            </InfoCard>

            <InfoCard title="DBS summary">
              <div className="py-2">
                <DbsBadge expiryDate={staff.dbs_expiry_date} showDate size="md" />
              </div>
              <Row label="Cert number"    value={staff.dbs_certificate_number} />
              <Row label="Issue date"     value={staff.dbs_issue_date ? formatDate(staff.dbs_issue_date) : null} />
              <Row label="Expiry date"    value={staff.dbs_expiry_date ? formatDate(staff.dbs_expiry_date) : null} />
              <Row label="Update service" value={staff.dbs_update_service ? 'Enrolled' : 'Not enrolled'} />
            </InfoCard>
          </div>
        </TabPanel>

        {/* ── DBS ─────────────────────────────────── */}
        <TabPanel id="dbs">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-md">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Current DBS status</p>
              <DbsBadge expiryDate={staff.dbs_expiry_date} showDate size="md" />
            </div>
            <div className="divide-y divide-slate-100">
              <Row label="Certificate number" value={staff.dbs_certificate_number} />
              <Row label="Issue date"         value={staff.dbs_issue_date ? formatDate(staff.dbs_issue_date) : null} />
              <Row label="Expiry date"        value={staff.dbs_expiry_date ? formatDate(staff.dbs_expiry_date) : null} />
              <Row label="Update Service"     value={staff.dbs_update_service ? 'Enrolled' : 'Not enrolled'} />
            </div>
            {canEdit && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/staff/${params.id}/edit`}>Update DBS details</Link>
              </Button>
            )}
          </div>
        </TabPanel>

        {/* ── TRAINING ────────────────────────────── */}
        <TabPanel id="training">
          <StaffTrainingTab
            staffId={params.id}
            training={training ?? []}
            categories={categories ?? []}
            trainingGaps={trainingGaps}
            canEdit={canEdit}
          />
        </TabPanel>

        {/* ── SUPERVISION ─────────────────────────── */}
        <TabPanel id="supervision">
          <StaffSupervisionTab
            staffId={params.id}
            supervisions={(supervisions ?? []) as any}
            lastSupervisionDate={lastSupervision}
            canEdit={canEdit}
          />
        </TabPanel>

        {/* ── APPRAISALS ──────────────────────────── */}
        <TabPanel id="appraisals">
          <StaffAppraisalTab
            staffId={params.id}
            appraisals={(appraisals ?? []) as any}
            ratingConfig={RATING_CONFIG}
            canEdit={canEdit}
          />
        </TabPanel>
      </Tabs>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <div className="px-5 py-2 divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  )
}
