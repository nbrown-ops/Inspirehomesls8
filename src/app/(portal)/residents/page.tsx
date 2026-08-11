import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { ResidentStatusBadge, LegalStatusBadge } from '@/components/residents/ResidentStatusBadge'
import { calculateAge, formatDate } from '@/lib/utils/dates'
import { canWrite } from '@/lib/constants/roles'

export default async function ResidentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: residents, error } = await supabase
    .from('service_users')
    .select(`
      id, first_name, last_name, preferred_name, date_of_birth, photo_url,
      status, placement_type, legal_status, is_asylum_seeker, room_number,
      placement_start_date,
      key_worker:profiles!key_worker_id(full_name),
      home:homes!home_id(name)
    `)
    .order('last_name')

  const role     = profileData?.role
  const canAdd   = role && canWrite(role) && role !== 'staff'

  const active     = residents?.filter(r => r.status === 'active') ?? []
  const inactive   = residents?.filter(r => r.status !== 'active') ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Residents</h1>
          <p className="mt-1 text-sm text-slate-500">
            {residents?.length ?? 0} total &middot; {active.length} active
          </p>
        </div>
        {canAdd && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/residents/new">
              <Plus className="h-4 w-4" />
              Add resident
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Could not load residents. Please refresh.
        </div>
      )}

      {/* Active residents */}
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Active ({active.length})
          </h2>
          <ResidentGrid residents={active as any} />
        </section>
      )}

      {/* Inactive / discharged */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Inactive / Discharged ({inactive.length})
          </h2>
          <ResidentGrid residents={inactive as any} muted />
        </section>
      )}

      {residents?.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No residents found</p>
          <p className="text-sm mt-1">
            {canAdd ? 'Add the first resident to get started.' : 'No residents are assigned to your account.'}
          </p>
        </div>
      )}
    </div>
  )
}

type ResidentRow = {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  date_of_birth: string
  photo_url: string | null
  status: string
  legal_status: string | null
  is_asylum_seeker: boolean
  room_number: string | null
  placement_start_date: string
  key_worker: { full_name: string } | null
  home: { name: string } | null
}

function ResidentGrid({ residents, muted = false }: { residents: ResidentRow[]; muted?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {residents.map(r => (
        <Link
          key={r.id}
          href={`/residents/${r.id}`}
          className={`group bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-md transition-all ${muted ? 'opacity-60 hover:opacity-100' : ''}`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {r.photo_url ? (
              <img
                src={r.photo_url}
                alt=""
                className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-700 font-bold text-base">
                {r.first_name[0]}{r.last_name[0]}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                {r.preferred_name ?? r.first_name} {r.last_name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Age {calculateAge(r.date_of_birth)} &middot; {r.home?.name ?? '—'}
              </p>
              {r.room_number && (
                <p className="text-xs text-slate-400">Room {r.room_number}</p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <ResidentStatusBadge status={r.status as never} />
            <LegalStatusBadge legalStatus={r.legal_status} isAsylumSeeker={r.is_asylum_seeker} />
          </div>

          {r.key_worker && (
            <p className="mt-2 text-xs text-slate-400 truncate">
              KW: {r.key_worker.full_name}
            </p>
          )}

          <p className="mt-1 text-xs text-slate-400">
            Since {formatDate(r.placement_start_date)}
          </p>
        </Link>
      ))}
    </div>
  )
}
