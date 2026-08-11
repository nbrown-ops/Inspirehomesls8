import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Clock, MessageSquare, CalendarCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ResidentStatusBadge, LegalStatusBadge } from '@/components/residents/ResidentStatusBadge'
import { calculateAge, formatDate, formatTimeAgo } from '@/lib/utils/dates'

export default async function ExternalDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // RLS returns only residents this social worker is linked to
  const { data: residents } = await supabase
    .from('service_users')
    .select(`
      id, first_name, last_name, preferred_name,
      date_of_birth, photo_url, status, legal_status, is_asylum_seeker,
      placement_start_date, room_number,
      home:homes!home_id(name, city),
      key_worker:profiles!key_worker_id(full_name, phone, email)
    `)
    .order('last_name')

  // Unread professional notes written by this user (to show they're pending)
  const { data: pendingRequests } = await supabase
    .from('meeting_requests')
    .select('id, status, proposed_date, service_user_id')
    .eq('requested_by', user.id)
    .eq('status', 'pending')

  // Recent unread team responses (notes marked as read that have responses)
  const { data: unreadNotes } = await supabase
    .from('professional_notes')
    .select('id, created_at, service_user_id')
    .eq('authored_by', user.id)
    .eq('is_read', false)
    .limit(5)

  const active = residents?.filter(r => r.status === 'active') ?? []
  const other  = residents?.filter(r => r.status !== 'active') ?? []

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your caseload</h1>
        <p className="mt-1 text-slate-500">
          {residents?.length ?? 0} young {residents?.length === 1 ? 'person' : 'people'} on your caseload
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5 text-purple-600" />} label="Active" value={active.length} color="purple" />
        <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Pending requests" value={pendingRequests?.length ?? 0} color="amber" />
        <StatCard icon={<MessageSquare className="h-5 w-5 text-sky-600" />} label="Unread" value={unreadNotes?.length ?? 0} color="sky" />
        <StatCard icon={<CalendarCheck className="h-5 w-5 text-green-600" />} label="Total" value={residents?.length ?? 0} color="green" />
      </div>

      {/* Active residents */}
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Active placements
          </h2>
          <div className="space-y-3">
            {active.map(r => (
              <ResidentCard key={r.id} resident={r as any} />
            ))}
          </div>
        </section>
      )}

      {/* Other placements */}
      {other.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Previous / inactive
          </h2>
          <div className="space-y-3 opacity-60">
            {other.map(r => (
              <ResidentCard key={r.id} resident={r as any} />
            ))}
          </div>
        </section>
      )}

      {residents?.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No young people linked to your account</p>
          <p className="text-sm text-slate-400 mt-1">
            Contact the care home manager to be linked to your cases.
          </p>
        </div>
      )}

      {/* How to use */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-sm text-purple-800 space-y-1.5">
        <p className="font-semibold">How to use this portal</p>
        <ul className="list-disc ml-4 space-y-1 text-purple-700">
          <li>Click a young person's card to view their profile</li>
          <li>Use <strong>Message the team</strong> to leave a note for the key worker</li>
          <li>Use <strong>Request a meeting</strong> to propose a date — the manager will respond</li>
          <li>You cannot edit any records — contact the home manager to request changes</li>
        </ul>
      </div>
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
  placement_start_date: string
  room_number: string | null
  home: { name: string; city: string } | null
  key_worker: { full_name: string; phone: string | null; email: string | null } | null
}

function ResidentCard({ resident: r }: { resident: ResidentRow }) {
  return (
    <Link
      href={`/portal/residents/${r.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4">
        {r.photo_url ? (
          <img src={r.photo_url} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-slate-100" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl shrink-0">
            {r.first_name[0]}{r.last_name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-base group-hover:text-purple-700 transition-colors">
            {r.preferred_name ?? r.first_name} {r.last_name}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            Age {calculateAge(r.date_of_birth)} &middot; {r.home?.name}, {r.home?.city}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <ResidentStatusBadge status={r.status as never} />
            <LegalStatusBadge legalStatus={r.legal_status} isAsylumSeeker={r.is_asylum_seeker} />
          </div>
        </div>
        <span className="text-xs text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 hidden sm:block">
          View profile →
        </span>
      </div>

      {r.key_worker && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
          <span className="text-xs font-medium text-slate-400">Key worker:</span>
          <span className="text-slate-700">{r.key_worker.full_name}</span>
          {r.key_worker.phone && (
            <a
              href={`tel:${r.key_worker.phone}`}
              onClick={e => e.stopPropagation()}
              className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              {r.key_worker.phone}
            </a>
          )}
        </div>
      )}
    </Link>
  )
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  const bg: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200',
    amber:  'bg-amber-50  border-amber-200',
    sky:    'bg-sky-50    border-sky-200',
    green:  'bg-green-50  border-green-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${bg[color] ?? 'bg-white border-slate-200'}`}>
      {icon}
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
