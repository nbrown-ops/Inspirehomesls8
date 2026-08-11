import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Clock, MapPin, Building2, ShieldAlert, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils/dates'
import { canWrite, isAdmin } from '@/lib/constants/roles'
import { IncidentStatusPanel } from '@/components/incidents/IncidentStatusPanel'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-red-50 text-red-600 border-red-100',
  medium:   'bg-amber-50 text-amber-700 border-amber-100',
  low:      'bg-slate-100 text-slate-600 border-slate-200',
}

const STATUS_STYLES: Record<string, string> = {
  open:         'bg-red-50 text-red-700',
  under_review: 'bg-amber-50 text-amber-700',
  closed:       'bg-green-50 text-green-700',
  referred:     'bg-blue-50 text-blue-700',
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: incident } = await supabase
    .from('incident_reports')
    .select(`
      id, incident_type, severity, status,
      occurred_at, incident_date, incident_time,
      location, description, immediate_action,
      injuries_sustained, injury_details,
      safeguarding_concern,
      police_notified, police_reference,
      social_worker_notified, manager_notified, parent_nok_notified,
      ofsted_reportable, cqc_reportable,
      follow_up_required, follow_up_notes,
      manager_comments, manager_sign_off_at,
      closed_at, created_at, updated_at,
      service_users!service_user_id(id, first_name, last_name),
      reporter:profiles!reported_by(id, full_name, job_title),
      sign_off_by:profiles!manager_sign_off(id, full_name),
      closed_by_profile:profiles!closed_by(full_name),
      home:homes!home_id(name)
    `)
    .eq('id', params.id)
    .single()

  if (!incident) notFound()

  const su          = incident.service_users as unknown as { id: string; first_name: string; last_name: string } | null
  const reporter    = incident.reporter      as unknown as { id: string; full_name: string; job_title: string | null } | null
  const signOffBy   = incident.sign_off_by   as unknown as { id: string; full_name: string } | null
  const closedBy    = incident.closed_by_profile as unknown as { full_name: string } | null
  const home        = incident.home          as unknown as { name: string } | null

  const canEdit    = canWrite(profile.role) && profile.role !== 'auditor'
  const canManage  = isAdmin(profile.role)
  const isClosed   = incident.status === 'closed'

  // Build a display timestamp from occurred_at (new) or incident_date + time (legacy)
  const occurrenceDisplay = (() => {
    if (incident.occurred_at) return formatDateTime(incident.occurred_at)
    if (incident.incident_date) {
      const iso = `${incident.incident_date}T${incident.incident_time ?? '00:00'}:00`
      return formatDateTime(iso)
    }
    return '—'
  })()

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to incidents
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${SEVERITY_STYLES[incident.severity] ?? ''}`}>
                {incident.severity} severity
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[incident.status] ?? ''}`}>
                {incident.status.replace(/_/g, ' ')}
              </span>
              {incident.ofsted_reportable && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Ofsted notifiable</span>
              )}
              {incident.cqc_reportable && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">CQC notifiable</span>
              )}
              {incident.safeguarding_concern && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Safeguarding
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 capitalize">
              {incident.incident_type.replace(/_/g, ' ')}
            </h1>
            {su && (
              <Link href={`/residents/${su.id}`} className="text-sm text-purple-700 hover:underline mt-1 block">
                {su.first_name} {su.last_name}
              </Link>
            )}
          </div>
          {canEdit && !isClosed && (
            <Link
              href={`/incidents/${params.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-purple-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:border-purple-300 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{occurrenceDisplay}</span>
          </div>
          {incident.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{incident.location}</span>
            </div>
          )}
          {home && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>{home.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Safeguarding concern — prominent if present */}
      {incident.safeguarding_concern && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide">Safeguarding Concern</h2>
          </div>
          <p className="text-sm text-red-900 whitespace-pre-wrap">{incident.safeguarding_concern}</p>
        </div>
      )}

      {/* Description */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Description</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
      </section>

      {/* Immediate action */}
      {incident.immediate_action && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Immediate Action Taken</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{incident.immediate_action}</p>
        </section>
      )}

      {/* Injuries */}
      {incident.injuries_sustained && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Injuries Sustained</h2>
          </div>
          {incident.injury_details && (
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{incident.injury_details}</p>
          )}
        </section>
      )}

      {/* Follow-up */}
      {incident.follow_up_required && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-2">
          <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Follow-Up Required</h2>
          {incident.follow_up_notes && (
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{incident.follow_up_notes}</p>
          )}
        </section>
      )}

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Notifications &amp; References</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Family / NOK notified"    value={incident.parent_nok_notified    ? 'Yes' : 'No'} positive={incident.parent_nok_notified} />
          <InfoRow label="Social worker notified"   value={incident.social_worker_notified ? 'Yes' : 'No'} positive={incident.social_worker_notified} />
          <InfoRow label="Manager notified"         value={incident.manager_notified       ? 'Yes' : 'No'} positive={incident.manager_notified} />
          <InfoRow label="Police involved"          value={incident.police_notified        ? 'Yes' : 'No'} positive={incident.police_notified} />
          {incident.police_reference && (
            <InfoRow label="Police reference" value={incident.police_reference} />
          )}
        </div>
      </section>

      {/* Regulatory */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Regulatory Reporting</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Ofsted notifiable" value={incident.ofsted_reportable ? 'Yes' : 'No'} positive={incident.ofsted_reportable} />
          <InfoRow label="CQC notifiable"    value={incident.cqc_reportable    ? 'Yes' : 'No'} positive={incident.cqc_reportable} />
        </div>
      </section>

      {/* Status workflow + sign-off — interactive client component */}
      <IncidentStatusPanel
        incidentId={params.id}
        currentStatus={incident.status}
        canManage={canManage}
        canEdit={canEdit}
        signOffBy={signOffBy?.full_name ?? null}
        signOffAt={incident.manager_sign_off_at ?? null}
        managerComments={incident.manager_comments ?? null}
      />

      {/* Record details */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Record Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Reported by"  value={reporter ? `${reporter.full_name}${reporter.job_title ? ` (${reporter.job_title})` : ''}` : '—'} />
          <InfoRow label="Reported at"  value={formatDateTime(incident.created_at)} />
          {incident.closed_at && (
            <InfoRow label="Closed at" value={formatDateTime(incident.closed_at)} />
          )}
          {closedBy && (
            <InfoRow label="Closed by" value={closedBy.full_name} />
          )}
          <InfoRow label="Last updated" value={formatDateTime(incident.updated_at)} />
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={positive ? 'text-green-700 font-medium' : 'text-slate-900'}>{value}</p>
    </div>
  )
}
