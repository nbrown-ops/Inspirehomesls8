import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Pill, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { canWrite } from '@/lib/constants/roles'

export default async function MedicationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: medications } = await supabase
    .from('medications')
    .select(`
      id, medication_name, dosage, route, frequency, is_prn, is_controlled,
      is_active, start_date, end_date, prescriber, prescriber_contact,
      service_users!service_user_id(id, first_name, last_name),
      home:homes!home_id(name)
    `)
    .order('medication_name')

  const active    = medications?.filter(m => m.is_active) ?? []
  const inactive  = medications?.filter(m => !m.is_active) ?? []
  const controlled = active.filter(m => m.is_controlled)
  const prn       = active.filter(m => m.is_prn && !m.is_controlled)
  const regular   = active.filter(m => !m.is_prn && !m.is_controlled)
  const canAdd    = canWrite(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.length} active &middot; {controlled.length} controlled drugs &middot; {prn.length} PRN
          </p>
        </div>
        {canAdd && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/medications/new"><Plus className="h-4 w-4" />Add medication</Link>
          </Button>
        )}
      </div>

      {/* Controlled drugs — highlighted */}
      {controlled.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-700">Controlled Drugs ({controlled.length})</h2>
          </div>
          <MedicationGrid medications={controlled as any} />
        </section>
      )}

      {/* Regular medications */}
      {regular.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Regular ({regular.length})</h2>
          <MedicationGrid medications={regular as any} />
        </section>
      )}

      {/* PRN */}
      {prn.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">PRN / As Required ({prn.length})</h2>
          <MedicationGrid medications={prn as any} />
        </section>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Discontinued ({inactive.length})</h2>
          <MedicationGrid medications={inactive as any} muted />
        </section>
      )}

      {!medications?.length && (
        <div className="text-center py-20 text-slate-400">
          <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No medications recorded</p>
          {canAdd && <p className="text-sm mt-1">Add the first medication above.</p>}
        </div>
      )}
    </div>
  )
}

type MedRow = {
  id: string
  medication_name: string
  dosage: string
  route: string
  frequency: string
  is_prn: boolean
  is_controlled: boolean
  is_active: boolean
  start_date: string
  end_date: string | null
  prescriber: string | null
  service_users: { id: string; first_name: string; last_name: string } | null
  home: { name: string } | null
}

function MedicationGrid({ medications, muted = false }: { medications: MedRow[]; muted?: boolean }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${muted ? 'opacity-60' : ''}`}>
      {medications.map(med => {
        const su = med.service_users as { id: string; first_name: string; last_name: string } | null
        return (
          <Link
            key={med.id}
            href={`/medications/${med.id}`}
            className={`block bg-white rounded-xl border p-4 hover:border-purple-300 hover:shadow-sm transition-all ${
              med.is_controlled ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900 text-sm">{med.medication_name}</p>
              <div className="flex gap-1 flex-wrap justify-end">
                {med.is_controlled && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">CD</span>
                )}
                {med.is_prn && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">PRN</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {med.dosage} · {med.route} · {med.frequency}
            </p>
            {su && (
              <p className="text-xs font-medium text-purple-700 mt-2">
                {su.first_name} {su.last_name}
              </p>
            )}
            {(med.home as { name: string } | null)?.name && (
              <p className="text-xs text-slate-400">{(med.home as { name: string }).name}</p>
            )}
            {med.prescriber && (
              <p className="text-xs text-slate-400 mt-1">Prescribed by {med.prescriber}</p>
            )}
            <p className="text-xs text-slate-300 mt-1">From {formatDate(med.start_date)}</p>
          </Link>
        )
      })}
    </div>
  )
}
