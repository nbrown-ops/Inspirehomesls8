import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pill, AlertTriangle, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/dates'
import { MARChart } from '@/components/medications/MARChart'

export default async function MedicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: med } = await supabase
    .from('medications')
    .select(`
      id, medication_name, dosage, route, frequency, is_prn, is_controlled,
      is_active, start_date, end_date, prescriber, prescriber_contact,
      storage_instructions, side_effects, administration_notes,
      created_at, updated_at,
      service_user:service_users!service_user_id(id, first_name, last_name),
      home:homes!home_id(name),
      mar_entries(
        id, administered_at, outcome, notes,
        administered_by:profiles!administered_by(full_name)
      )
    `)
    .eq('id', params.id)
    .order('administered_at', { referencedTable: 'mar_entries', ascending: false })
    .single()

  if (!med) notFound()

  const su         = med.service_user as unknown as { id: string; first_name: string; last_name: string } | null
  const home       = med.home as unknown as { name: string } | null
  const canWrite   = ['super_admin', 'manager', 'staff'].includes(profile.role)

  type MAREntryRaw = { id: string; administered_at: string; outcome: string; notes: string | null; administered_by: { full_name: string } | null }
  const initialEntries = (med.mar_entries as unknown as MAREntryRaw[]) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/medications" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to medications
      </Link>

      {/* Header */}
      <div className={`rounded-xl border p-6 ${med.is_controlled ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {med.is_controlled && (
                <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="h-3 w-3" /> Controlled Drug
                </div>
              )}
              {med.is_prn && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">PRN / As Required</span>
              )}
              <Badge variant={med.is_active ? 'success' : 'default'}>
                {med.is_active ? 'Active' : 'Discontinued'}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{med.medication_name}</h1>
            {su && (
              <Link href={`/residents/${su.id}`} className="text-sm text-purple-700 hover:underline mt-1 block">
                {su.first_name} {su.last_name}
              </Link>
            )}
          </div>
          <Pill className="h-8 w-8 text-slate-300 shrink-0" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 text-sm">
          <InfoTile label="Dosage" value={med.dosage} />
          <InfoTile label="Route" value={med.route} />
          <InfoTile label="Frequency" value={med.frequency} />
          {med.prescriber && <InfoTile label="Prescriber" value={med.prescriber} />}
          {med.prescriber_contact && <InfoTile label="Contact" value={med.prescriber_contact} />}
          {home && <InfoTile label="Property" value={home.name} />}
          <InfoTile label="Start date" value={formatDate(med.start_date)} />
          {med.end_date && <InfoTile label="End date" value={formatDate(med.end_date)} />}
        </div>
      </div>

      {/* Clinical Notes */}
      {(med.administration_notes || med.side_effects || med.storage_instructions) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Clinical Notes</h2>
          {med.administration_notes && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Administration notes</p>
              <p className="text-sm text-slate-700">{med.administration_notes}</p>
            </div>
          )}
          {med.side_effects && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Known side effects</p>
              <p className="text-sm text-slate-700">{med.side_effects}</p>
            </div>
          )}
          {med.storage_instructions && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Storage instructions</p>
              <p className="text-sm text-slate-700">{med.storage_instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* MAR Chart — client component with log button */}
      <MARChart
        medicationId={med.id}
        serviceUserId={(med.service_user as unknown as { id: string } | null)?.id ?? ''}
        defaultDose={med.dosage}
        initialEntries={initialEntries}
        canWrite={canWrite && med.is_active}
      />
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
