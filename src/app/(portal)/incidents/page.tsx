import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, FileWarning, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatTimeAgo } from '@/lib/utils/dates'
import { canWrite } from '@/lib/constants/roles'

const SEVERITY: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-red-50 text-red-600 border-red-100',
  medium:   'bg-amber-50 text-amber-700 border-amber-100',
  low:      'bg-slate-100 text-slate-600 border-slate-200',
}
const STATUS: Record<string, string> = {
  open:         'bg-red-50 text-red-700',
  under_review: 'bg-amber-50 text-amber-700',
  closed:       'bg-green-50 text-green-700',
  referred:     'bg-blue-50 text-blue-700',
}

export default async function IncidentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: incidents } = await supabase
    .from('incident_reports')
    .select(`
      id, incident_type, severity, status, occurred_at, created_at, location,
      service_users!service_user_id(id, first_name, last_name),
      reported_by:profiles!reported_by_id(full_name),
      home:homes!home_id(name)
    `)
    .order('occurred_at', { ascending: false })
    .limit(100)

  const open       = incidents?.filter(i => i.status === 'open') ?? []
  const inReview   = incidents?.filter(i => i.status === 'under_review') ?? []
  const resolved   = incidents?.filter(i => i.status === 'closed' || i.status === 'referred') ?? []
  const canAdd     = canWrite(profile.role) && profile.role !== 'auditor'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
          <p className="mt-1 text-sm text-slate-500">
            {incidents?.length ?? 0} total &middot; {open.length} open &middot; {inReview.length} under review
          </p>
        </div>
        {canAdd && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/incidents/new"><Plus className="h-4 w-4" />Report incident</Link>
          </Button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Open', count: open.length, color: 'bg-red-100 text-red-700' },
          { label: 'Under review', count: inReview.length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Resolved', count: resolved.length, color: 'bg-green-100 text-green-700' },
        ].map(({ label, count, color }) => (
          <span key={label} className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
            {count} {label}
          </span>
        ))}
      </div>

      {/* Open incidents */}
      {open.length > 0 && (
        <IncidentSection title="Open" incidents={open as any} />
      )}

      {/* Under review */}
      {inReview.length > 0 && (
        <IncidentSection title="Under Review" incidents={inReview as any} />
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <IncidentSection title="Resolved / Referred" incidents={resolved as any} muted />
      )}

      {!incidents?.length && (
        <div className="text-center py-20 text-slate-400">
          <FileWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No incidents recorded</p>
          {canAdd && <p className="text-sm mt-1">Use the button above to report an incident.</p>}
        </div>
      )}
    </div>
  )
}

type IncidentRow = {
  id: string
  incident_type: string
  severity: string
  status: string
  occurred_at: string
  location: string | null
  service_users: { id: string; first_name: string; last_name: string } | null
  reported_by: { full_name: string } | null
  home: { name: string } | null
}

function IncidentSection({ title, incidents, muted = false }: { title: string; incidents: IncidentRow[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title} ({incidents.length})</h2>
      <div className={`space-y-2 ${muted ? 'opacity-70' : ''}`}>
        {incidents.map(inc => {
          const su = inc.service_users as { id: string; first_name: string; last_name: string } | null
          return (
            <Link
              key={inc.id}
              href={`/incidents/${inc.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">
                      {su ? `${su.first_name} ${su.last_name}` : 'No resident linked'}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${SEVERITY[inc.severity] ?? ''}`}>
                      {inc.severity}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS[inc.status] ?? ''}`}>
                      {inc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {inc.incident_type.replace(/_/g, ' ')}
                    {inc.location ? ` · ${inc.location}` : ''}
                    {(inc.home as { name: string } | null)?.name ? ` · ${(inc.home as { name: string }).name}` : ''}
                  </p>
                  {inc.reported_by && (
                    <p className="text-xs text-slate-400 mt-0.5">Reported by {(inc.reported_by as { full_name: string }).full_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{formatTimeAgo(inc.occurred_at)}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{formatDateTime(inc.occurred_at)}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
